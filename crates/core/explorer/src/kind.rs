//! [`FileKind`]: what a file is, from its extension. Drives the icon, the "Type" column and
//! which preview the UI shows. Content sniffing is left to the previewers.

use serde::Serialize;

/// A coarse file category.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FileKind {
    Folder,
    Image,
    Video,
    Audio,
    Text,
    Markdown,
    Code,
    Data,
    Pdf,
    Document,
    Spreadsheet,
    Presentation,
    Archive,
    DiskImage,
    Executable,
    Font,
    Other,
}

impl FileKind {
    /// The kind of a file named `name` (folders are decided by the caller).
    pub fn from_name(name: &str) -> Self {
        extension(name).map_or(Self::Other, |ext| Self::from_extension(&ext))
    }

    /// The kind for a lower-case extension without the dot.
    pub fn from_extension(ext: &str) -> Self {
        match ext {
            "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" | "svg" | "avif" | "tif"
            | "tiff" | "heic" | "psd" | "raw" => Self::Image,
            "mp4" | "mkv" | "mov" | "avi" | "webm" | "wmv" | "m4v" | "flv" | "mpg" | "mpeg" => {
                Self::Video
            }
            "mp3" | "wav" | "flac" | "ogg" | "oga" | "m4a" | "aac" | "opus" | "wma" | "aiff" => {
                Self::Audio
            }
            "txt" | "log" | "text" | "rtf" | "nfo" => Self::Text,
            "md" | "markdown" | "mdx" => Self::Markdown,
            "rs" | "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" | "py" | "rb" | "go" | "java"
            | "kt" | "c" | "h" | "cpp" | "hpp" | "cc" | "cs" | "swift" | "php" | "lua" | "sh"
            | "bash" | "zsh" | "ps1" | "bat" | "cmd" | "html" | "htm" | "css" | "scss" | "less"
            | "vue" | "svelte" | "sql" | "dart" | "zig" | "r" => Self::Code,
            "json" | "jsonc" | "json5" | "toml" | "yaml" | "yml" | "xml" | "csv" | "tsv"
            | "ini" | "cfg" | "conf" | "env" | "lock" => Self::Data,
            "pdf" => Self::Pdf,
            "doc" | "docx" | "odt" | "pages" | "epub" => Self::Document,
            "xls" | "xlsx" | "ods" | "numbers" => Self::Spreadsheet,
            "ppt" | "pptx" | "odp" | "key" => Self::Presentation,
            "zip" | "7z" | "rar" | "tar" | "gz" | "tgz" | "bz2" | "xz" | "zst" => Self::Archive,
            "iso" | "img" | "dmg" | "vhd" | "vhdx" => Self::DiskImage,
            "exe" | "msi" | "app" | "appimage" | "deb" | "rpm" | "apk" | "com" => Self::Executable,
            "ttf" | "otf" | "woff" | "woff2" => Self::Font,
            _ => Self::Other,
        }
    }

    /// Plain-text kinds the text previewer and content search read.
    pub const fn is_textual(self) -> bool {
        matches!(self, Self::Text | Self::Markdown | Self::Code | Self::Data)
    }

    /// The MIME type the preview protocol serves for `name`.
    pub fn mime(name: &str) -> &'static str {
        match extension(name).as_deref() {
            Some("png") => "image/png",
            Some("jpg" | "jpeg") => "image/jpeg",
            Some("gif") => "image/gif",
            Some("webp") => "image/webp",
            Some("bmp") => "image/bmp",
            Some("ico") => "image/x-icon",
            Some("svg") => "image/svg+xml",
            Some("avif") => "image/avif",
            Some("mp4" | "m4v") => "video/mp4",
            Some("webm") => "video/webm",
            Some("mov") => "video/quicktime",
            Some("mp3") => "audio/mpeg",
            Some("wav") => "audio/wav",
            Some("flac") => "audio/flac",
            Some("ogg" | "oga") => "audio/ogg",
            Some("m4a" | "aac") => "audio/mp4",
            Some("opus") => "audio/opus",
            Some("pdf") => "application/pdf",
            _ => "application/octet-stream",
        }
    }
}

/// The lower-case extension of `name`, without the dot. Dotfiles (`.gitignore`) have none.
pub fn extension(name: &str) -> Option<String> {
    let (stem, ext) = name.rsplit_once('.')?;
    (!stem.is_empty() && !ext.is_empty()).then(|| ext.to_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_by_extension_case_insensitively() {
        assert_eq!(FileKind::from_name("Photo.JPG"), FileKind::Image);
        assert_eq!(FileKind::from_name("main.rs"), FileKind::Code);
        assert_eq!(FileKind::from_name("README.md"), FileKind::Markdown);
        assert_eq!(FileKind::from_name("archive.tar.gz"), FileKind::Archive);
        assert_eq!(FileKind::from_name("Makefile"), FileKind::Other);
    }

    #[test]
    fn dotfiles_have_no_extension() {
        assert_eq!(extension(".gitignore"), None);
        assert_eq!(extension("notes."), None);
        assert_eq!(extension("a.TXT").as_deref(), Some("txt"));
    }

    #[test]
    fn mime_types_for_previews() {
        assert_eq!(FileKind::mime("a.png"), "image/png");
        assert_eq!(FileKind::mime("a.unknown"), "application/octet-stream");
        assert!(FileKind::Code.is_textual());
        assert!(!FileKind::Image.is_textual());
    }
}
