//! GENSLATE design tokens (official Nord), generated from `packages/tokens`.
//!
//! Native code uses these to paint window backgrounds before the `WebView` loads (no white
//! flash) and to size windows consistently with the web UI.
#![forbid(unsafe_code)]

mod generated {
    pub mod theme_colors;
    pub mod tokens;
}

pub use generated::theme_colors::ThemeColors;
pub use generated::tokens::{POLAR_NIGHT, SNOW_STORM, THEMES, nord, size};

/// An opaque sRGB colour.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Rgb {
    pub const fn new(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b }
    }

    /// `#rrggbb`.
    pub fn to_hex(self) -> String {
        format!("#{:02x}{:02x}{:02x}", self.r, self.g, self.b)
    }

    /// `(r, g, b, 255)`, the shape Tauri's `Color` converts from.
    pub const fn to_rgba(self) -> (u8, u8, u8, u8) {
        (self.r, self.g, self.b, 255)
    }
}

/// Light or dark colour scheme.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Scheme {
    Dark,
    Light,
}

/// A resolved theme.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Theme {
    /// Stable id used by `[data-theme]` in the web UI.
    pub id: &'static str,
    pub name: &'static str,
    pub scheme: Scheme,
    pub colors: ThemeColors,
}

/// Looks up a theme by id (`"polar-night"` or `"snow-storm"`).
pub fn theme(id: &str) -> Option<&'static Theme> {
    THEMES.iter().find(|t| t.id == id)
}

/// The default theme for a scheme: Polar Night for dark, Snow Storm for light.
pub const fn theme_for_scheme(scheme: Scheme) -> &'static Theme {
    match scheme {
        Scheme::Dark => &POLAR_NIGHT,
        Scheme::Light => &SNOW_STORM,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nord_palette_is_official() {
        assert_eq!(nord::NORD_0.to_hex(), "#2e3440");
        assert_eq!(nord::NORD_8.to_hex(), "#88c0d0");
        assert_eq!(nord::NORD_15.to_hex(), "#b48ead");
    }

    #[test]
    fn themes_resolve_by_id_and_scheme() {
        assert_eq!(theme("polar-night").map(|t| t.scheme), Some(Scheme::Dark));
        assert_eq!(theme("snow-storm").map(|t| t.scheme), Some(Scheme::Light));
        assert!(theme("solarized").is_none());
        assert_eq!(theme_for_scheme(Scheme::Light).id, "snow-storm");
    }

    #[test]
    fn polar_night_canvas_is_nord0() {
        assert_eq!(POLAR_NIGHT.colors.canvas, nord::NORD_0);
    }
}
