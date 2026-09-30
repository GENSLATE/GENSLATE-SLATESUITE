//! The two URI schemes the webview loads pictures from. Both take a library id, never a path,
//! so nothing rendered in the webview can read files outside the library:
//!
//! - `gallery-thumb://localhost/<edge>/<id>` (`http://gallery-thumb.localhost/…` on Windows):
//!   a cached JPEG or PNG render whose long edge is [`THUMB_EDGE`] (grid) or
//!   [`DISPLAY_EDGE`] (the viewer's stand-in for TIFF and JPEG XL).
//! - `gallery-media://localhost/<id>`: the original file, with byte ranges so videos can seek.

use std::borrow::Cow;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::thread;

use genslate_core_gallery::kind::{self, Format};
use genslate_core_gallery::thumbnail::{DISPLAY_EDGE, THUMB_EDGE, ThumbnailKey};
use tauri::http::{Request, Response, StatusCode, header};
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};

use crate::state::Gallery;

/// Thumbnails and renders.
pub const THUMB_SCHEME: &str = "gallery-thumb";
/// Original files.
pub const MEDIA_SCHEME: &str = "gallery-media";

/// Whole files above this size are only served in ranges.
const MAX_WHOLE: u64 = 64 * 1024 * 1024;
/// The largest single range response.
const MAX_RANGE: u64 = 4 * 1024 * 1024;

type Body = Cow<'static, [u8]>;

/// Serves a thumbnail on a worker thread (decoding never blocks the UI thread).
pub fn handle_thumb<R: Runtime>(
    context: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = context.app_handle().clone();
    spawn("gallery-thumb", move || {
        responder.respond(serve_thumb(&app.state::<Gallery>(), &request));
    });
}

/// Serves an original file on a worker thread.
pub fn handle_media<R: Runtime>(
    context: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = context.app_handle().clone();
    spawn("gallery-media", move || {
        responder.respond(serve_media(&app.state::<Gallery>(), &request));
    });
}

fn spawn(name: &str, work: impl FnOnce() + Send + 'static) {
    if let Err(error) = thread::Builder::new().name(name.to_owned()).spawn(work) {
        log::warn!("{name} thread: {error}");
    }
}

/// `/<edge>/<id>` → the edge and id.
fn thumb_request(path: &str) -> Option<(u32, i64)> {
    let mut parts = path.trim_start_matches('/').split('/');
    let edge: u32 = parts.next()?.parse().ok()?;
    let id: i64 = parts.next()?.parse().ok()?;
    if parts.next().is_some() || ![THUMB_EDGE, DISPLAY_EDGE].contains(&edge) {
        return None;
    }
    Some((edge, id))
}

/// `/<id>` → the id.
fn media_request(path: &str) -> Option<i64> {
    path.trim_start_matches('/').parse().ok()
}

fn serve_thumb(gallery: &Gallery, request: &Request<Vec<u8>>) -> Response<Body> {
    let Some((edge, id)) = thumb_request(request.uri().path()) else {
        return status(StatusCode::BAD_REQUEST);
    };
    let Ok((path, size, modified_ms)) = gallery.library.file_of(id) else {
        return status(StatusCode::NOT_FOUND);
    };
    let path = Path::new(&path);
    let Some(format) = Format::of(path).filter(|format| format.decodable()) else {
        return status(StatusCode::NOT_FOUND);
    };
    let key = ThumbnailKey {
        path,
        size,
        modified_ms,
        edge,
    };
    match gallery.thumbnails.get_or_render(&key, format) {
        Ok(encoded) => Response::builder()
            .header(header::CONTENT_TYPE, encoded.mime)
            .header(header::CACHE_CONTROL, "max-age=60")
            .header(header::CONTENT_LENGTH, encoded.bytes.len())
            .body(Cow::Owned(encoded.bytes))
            .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR)),
        Err(error) => {
            log::debug!("thumbnail {id}: {error}");
            status(StatusCode::UNPROCESSABLE_ENTITY)
        }
    }
}

fn serve_media(gallery: &Gallery, request: &Request<Vec<u8>>) -> Response<Body> {
    let Some(id) = media_request(request.uri().path()) else {
        return status(StatusCode::BAD_REQUEST);
    };
    let Ok((path, _, _)) = gallery.library.file_of(id) else {
        return status(StatusCode::NOT_FOUND);
    };
    let path = Path::new(&path);
    let Ok(mut file) = File::open(path) else {
        return status(StatusCode::NOT_FOUND);
    };
    let Ok(len) = file.metadata().map(|meta| meta.len()) else {
        return status(StatusCode::NOT_FOUND);
    };
    let range = request
        .headers()
        .get(header::RANGE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| parse_range(value, len));
    let (start, end, partial) = match range {
        Some((start, end)) => (start, end.min(start + MAX_RANGE - 1), true),
        None if len > MAX_WHOLE => (0, MAX_RANGE.min(len).saturating_sub(1), true),
        None => (0, len.saturating_sub(1), false),
    };
    let count = if len == 0 { 0 } else { end - start + 1 };
    let mut bytes = Vec::new();
    let read = file
        .seek(SeekFrom::Start(start))
        .and_then(|_| file.take(count).read_to_end(&mut bytes));
    if read.is_err() {
        return status(StatusCode::INTERNAL_SERVER_ERROR);
    }
    let mut builder = Response::builder()
        .header(header::CONTENT_TYPE, kind::mime(path))
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CACHE_CONTROL, "no-cache")
        .header(header::CONTENT_LENGTH, bytes.len());
    if partial {
        builder = builder
            .status(StatusCode::PARTIAL_CONTENT)
            .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{len}"));
    }
    builder
        .body(Cow::Owned(bytes))
        .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR))
}

/// `bytes=start-end` / `bytes=start-` / `bytes=-suffix` → an inclusive range inside `len`.
fn parse_range(value: &str, len: u64) -> Option<(u64, u64)> {
    let spec = value.strip_prefix("bytes=")?.split(',').next()?.trim();
    let (start, end) = spec.split_once('-')?;
    let last = len.checked_sub(1)?;
    let (start, end) = match (start.trim(), end.trim()) {
        ("", suffix) => {
            let suffix: u64 = suffix.parse().ok()?;
            (len.saturating_sub(suffix), last)
        }
        (start, "") => (start.parse().ok()?, last),
        (start, end) => (start.parse().ok()?, end.parse::<u64>().ok()?.min(last)),
    };
    (start <= end).then_some((start, end))
}

fn status(code: StatusCode) -> Response<Body> {
    let mut response = Response::new(Cow::Borrowed(&[][..]));
    *response.status_mut() = code;
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ranges() {
        assert_eq!(parse_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(parse_range("bytes=900-", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=0-5000", 1000), Some((0, 999)));
        assert_eq!(parse_range("bytes=500-100", 1000), None);
        assert_eq!(parse_range("bytes=0-1", 0), None);
    }

    #[test]
    fn parses_requests() {
        assert_eq!(thumb_request("/512/42"), Some((512, 42)));
        assert_eq!(thumb_request("/2560/7"), Some((2560, 7)));
        assert_eq!(thumb_request("/100/7"), None, "only known sizes");
        assert_eq!(thumb_request("/512/7/x"), None);
        assert_eq!(thumb_request("/512/..%2Fetc"), None);
        assert_eq!(media_request("/42"), Some(42));
        assert_eq!(media_request("/C:%5Cx.jpg"), None, "ids only, never paths");
    }
}
