//! `explorer-thumb://localhost/<edge>/<encoded path>` (`http://explorer-thumb.localhost/…` on
//! Windows): cached JPEG/PNG thumbnails for the icon and tile views. A `?v=<mtime>` query is
//! ignored (the UI adds it to bust the webview cache; the disk cache is keyed by mtime anyway).
//!
//! Same rule as [`crate::preview_scheme`]: only files directly in a folder the user opened are
//! served. Renders run on rayon's pool, so a folder of pictures decodes at most one per core
//! instead of one thread per request.

use std::borrow::Cow;
use std::path::{Path, PathBuf};

use genslate_core_explorer::entry::require_absolute;
use genslate_core_explorer::thumbnail::{self, ThumbnailKey};
use tauri::http::{Request, Response, StatusCode, header};
use tauri::{Manager, Runtime, UriSchemeContext, UriSchemeResponder};

use crate::preview_scheme::{percent_decode, status};
use crate::state::Explorer;

/// The URI scheme name.
pub const SCHEME: &str = "explorer-thumb";

type Body = Cow<'static, [u8]>;

/// Handles one request off the UI thread.
pub fn handle<R: Runtime>(
    context: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = context.app_handle().clone();
    rayon::spawn(move || responder.respond(serve(&app.state::<Explorer>(), &request)));
}

fn serve(explorer: &Explorer, request: &Request<Vec<u8>>) -> Response<Body> {
    let Some((edge, path)) = parse(request.uri().path()) else {
        return status(StatusCode::BAD_REQUEST);
    };
    if !explorer.may_preview(&path) {
        return status(StatusCode::FORBIDDEN);
    }
    if !thumbnail::is_supported(&path) {
        return status(StatusCode::UNSUPPORTED_MEDIA_TYPE);
    }
    let rendered =
        ThumbnailKey::read(&path, edge).and_then(|key| explorer.thumbnails.get_or_render(&key));
    match rendered {
        Ok(encoded) => Response::builder()
            .header(header::CONTENT_TYPE, encoded.mime)
            .header(header::CACHE_CONTROL, "private, max-age=86400")
            .header(header::CONTENT_LENGTH, encoded.bytes.len())
            .body(Cow::Owned(encoded.bytes))
            .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR)),
        Err(error) => {
            log::debug!("thumbnail {}: {error}", path.display());
            status(match error.kind() {
                "not-found" => StatusCode::NOT_FOUND,
                "permission-denied" => StatusCode::FORBIDDEN,
                "unsupported" | "image" => StatusCode::UNSUPPORTED_MEDIA_TYPE,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            })
        }
    }
}

/// `/<edge>/<percent-encoded absolute path>` → the clamped edge and the clean path.
fn parse(uri_path: &str) -> Option<(u32, PathBuf)> {
    let (edge, encoded) = uri_path.trim_start_matches('/').split_once('/')?;
    let edge = thumbnail::clamp_edge(edge.parse().ok()?);
    let path = require_absolute(Path::new(&percent_decode(encoded)?)).ok()?;
    Some((edge, path))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// An absolute path for the host OS (a bare `/…` is not absolute on Windows), percent-encoded.
    fn absolute(name: &str) -> (PathBuf, String) {
        let path = if cfg!(windows) {
            PathBuf::from(format!(r"C:\home\me\{name}"))
        } else {
            PathBuf::from(format!("/home/me/{name}"))
        };
        let encoded = path
            .to_string_lossy()
            .bytes()
            .map(|byte| match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'.' | b'-' | b'_' => {
                    char::from(byte).to_string()
                }
                _ => format!("%{byte:02X}"),
            })
            .collect();
        (path, encoded)
    }

    #[test]
    fn parses_edge_and_path() {
        let (expected, encoded) = absolute("a b.png");
        let (edge, path) = parse(&format!("/128/{encoded}")).unwrap_or_default();
        assert_eq!(edge, 128);
        assert_eq!(path, expected);
        let (_, encoded) = absolute("a.png");
        assert_eq!(
            parse(&format!("/9999/{encoded}")).map(|(edge, _)| edge),
            Some(512)
        );
        assert_eq!(
            parse(&format!("/1/{encoded}")).map(|(edge, _)| edge),
            Some(64)
        );
        assert_eq!(parse(&format!("/x/{encoded}")), None);
        assert_eq!(parse("/128/relative.png"), None);
        assert_eq!(parse("/128"), None);
    }
}
