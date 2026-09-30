//! `explorer-file://localhost/<encoded path>` (`http://explorer-file.localhost/…` on Windows):
//! image, audio, video and PDF bytes for the preview pane.
//!
//! Only files sitting directly in a folder the user opened this session are served (see
//! [`Explorer::may_preview`]), so nothing rendered in the webview can read arbitrary files by
//! URL. Byte ranges are supported so media can seek.

use std::borrow::Cow;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::thread;

use genslate_core_explorer::entry::require_absolute;
use genslate_core_explorer::kind::FileKind;
use tauri::http::{Request, Response, StatusCode, header};
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};

use crate::state::Explorer;

/// The URI scheme name.
pub const SCHEME: &str = "explorer-file";

/// Whole files above this size are only served in ranges.
const MAX_WHOLE: u64 = 64 * 1024 * 1024;
/// The largest single range response.
const MAX_RANGE: u64 = 4 * 1024 * 1024;

type Body = Cow<'static, [u8]>;

/// Handles one request on a worker thread (file reads never block the UI thread).
pub fn handle<R: Runtime>(
    context: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = context.app_handle().clone();
    let spawned = thread::Builder::new()
        .name("explorer-preview".to_owned())
        .spawn(move || responder.respond(serve(&app.state::<Explorer>(), &request)));
    if let Err(error) = spawned {
        log::warn!("preview thread: {error}");
    }
}

fn serve(explorer: &Explorer, request: &Request<Vec<u8>>) -> Response<Body> {
    let Some(path) = percent_decode(request.uri().path().trim_start_matches('/')) else {
        return status(StatusCode::BAD_REQUEST);
    };
    let Ok(path) = require_absolute(Path::new(&path)) else {
        return status(StatusCode::BAD_REQUEST);
    };
    if !explorer.may_preview(&path) {
        return status(StatusCode::FORBIDDEN);
    }
    let Ok(mut file) = File::open(&path) else {
        return status(StatusCode::NOT_FOUND);
    };
    let Ok(len) = file.metadata().map(|meta| meta.len()) else {
        return status(StatusCode::NOT_FOUND);
    };
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();
    let mime = FileKind::mime(&name);
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
        .header(header::CONTENT_TYPE, mime)
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

/// Decodes `%XX` escapes (the whole path arrives as one encoded segment).
pub fn percent_decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex = std::str::from_utf8(bytes.get(index + 1..index + 3)?).ok()?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            index += 3;
        } else {
            out.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// An empty response with `code`.
pub fn status(code: StatusCode) -> Response<Body> {
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
        assert_eq!(parse_range("items=0-1", 10), None);
    }

    #[test]
    fn decodes_whole_paths() {
        assert_eq!(
            percent_decode("%2Fhome%2Fme%2FMy%20Photo.png").as_deref(),
            Some("/home/me/My Photo.png")
        );
        assert_eq!(
            percent_decode("C%3A%5CUsers%5Cme%5Ca.png").as_deref(),
            Some("C:\\Users\\me\\a.png")
        );
        assert_eq!(percent_decode("%ZZ"), None);
    }
}
