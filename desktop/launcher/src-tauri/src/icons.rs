//! `launcher-icon://localhost/<source>/<key>` (`http://launcher-icon.localhost/…` on Windows):
//! app icons looked up **by id** in the catalog — the UI never sends a file path.

use std::borrow::Cow;

use genslate_core_launcher::catalog::{AppId, load_icon};
use tauri::http::{Request, Response, StatusCode, header};
use tauri::{Manager, Runtime, UriSchemeContext};

use crate::state::Launcher;

/// The URI scheme name.
pub const SCHEME: &str = "launcher-icon";

/// Handles one icon request.
pub fn handle<R: Runtime>(
    context: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
) -> Response<Cow<'static, [u8]>> {
    let launcher = context.app_handle().state::<Launcher>();
    let Some(id) = parse_id(request.uri().path()) else {
        return status(StatusCode::BAD_REQUEST);
    };
    let source = launcher
        .catalog()
        .find(&id)
        .and_then(|app| app.icon.clone());
    let Some(source) = source else {
        return status(StatusCode::NOT_FOUND);
    };
    match load_icon(&source, &launcher.paths.cache_dir) {
        Ok(icon) => Response::builder()
            .header(header::CONTENT_TYPE, icon.mime)
            .header(header::CACHE_CONTROL, "max-age=300")
            .body(Cow::Owned(icon.bytes))
            .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR)),
        Err(error) => {
            log::debug!("icon {id}: {error}");
            status(StatusCode::NOT_FOUND)
        }
    }
}

/// `/genslate/explorer` or `/portableapps/Firefox%23Portable%232` → an [`AppId`].
fn parse_id(path: &str) -> Option<AppId> {
    let mut parts = path.trim_start_matches('/').splitn(2, '/');
    let source = percent_decode(parts.next()?)?;
    let key = percent_decode(parts.next()?)?;
    format!("{source}/{key}").parse().ok()
}

fn percent_decode(text: &str) -> Option<String> {
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

fn status(code: StatusCode) -> Response<Cow<'static, [u8]>> {
    let mut response = Response::new(Cow::Borrowed(&[][..]));
    *response.status_mut() = code;
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_encoded_ids() {
        assert_eq!(
            parse_id("/genslate/explorer")
                .map(|id| id.to_string())
                .as_deref(),
            Some("genslate/explorer")
        );
        assert_eq!(
            parse_id("/portableapps/LibreOfficePortable%232").map(|id| id.key),
            Some("LibreOfficePortable#2".to_owned())
        );
        assert_eq!(parse_id("/genslate/..%2F..%2Fsecret"), None);
        assert_eq!(parse_id("/nope/x"), None);
        assert_eq!(parse_id("/genslate/%ZZ"), None);
    }
}
