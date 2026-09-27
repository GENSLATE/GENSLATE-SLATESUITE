//! Where the launcher window goes: bottom-right of the *work area* (the screen minus the
//! taskbar/dock) of the monitor under the cursor. Pure functions over physical pixels.
//!
//! The window is transparent and always as wide as the expanded (tools) layout. The UI draws
//! the visible frame at its right edge, [`FRAME_INSET`] in from the window edges (room for the
//! frame's shadow): [`NORMAL_FRAME_WIDTH`] wide with the apps list, [`EXPANDED_FRAME_WIDTH`]
//! with the tools open. Everything outside the frame is click-through.

use crate::config::SizePreset;

/// A rectangle in physical pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl Rect {
    /// Whether the point (physical px) is inside.
    pub fn contains(&self, x: f64, y: f64) -> bool {
        x >= f64::from(self.x)
            && y >= f64::from(self.y)
            && x < f64::from(self.x) + f64::from(self.width)
            && y < f64::from(self.y) + f64::from(self.height)
    }

    /// Squared distance from a point to the rectangle (0 inside).
    fn distance_sq(&self, x: f64, y: f64) -> f64 {
        let left = f64::from(self.x);
        let top = f64::from(self.y);
        let dx = (left - x).max(0.0).max(x - (left + f64::from(self.width)));
        let dy = (top - y).max(0.0).max(y - (top + f64::from(self.height)));
        dx * dx + dy * dy
    }
}

/// Frame width with the apps list (logical px).
pub const NORMAL_FRAME_WIDTH: f64 = 460.0;
/// Frame width while the tools view is open (logical px).
pub const EXPANDED_FRAME_WIDTH: f64 = 920.0;
/// Transparent border around the frame, for its shadow (`shadow-card` reaches 16 px).
pub const FRAME_INSET: f64 = 16.0;
/// Gap between the window and the work-area edges (logical px); the frame sits
/// `EDGE_MARGIN + FRAME_INSET` = 16 px from the screen edges.
pub const EDGE_MARGIN: f64 = 0.0;

impl SizePreset {
    /// Frame height in logical pixels.
    pub const fn height(self) -> f64 {
        match self {
            Self::S => 560.0,
            Self::M => 640.0,
            Self::L => 740.0,
        }
    }
}

/// Logical `(width, height)` of the (fixed-size) window for a height preset.
pub fn window_size(size: SizePreset) -> (f64, f64) {
    (
        EXPANDED_FRAME_WIDTH + 2.0 * FRAME_INSET,
        size.height() + 2.0 * FRAME_INSET,
    )
}

/// The visible frame (physical px) inside a window at `window` (physical px).
pub fn frame_rect(window: Rect, scale: f64, expanded: bool) -> Rect {
    let scale = if scale.is_finite() && scale > 0.0 {
        scale
    } else {
        1.0
    };
    let inset = to_px(FRAME_INSET * scale);
    let wanted = if expanded {
        EXPANDED_FRAME_WIDTH
    } else {
        NORMAL_FRAME_WIDTH
    };
    let width = to_px(wanted * scale).min(window.width.saturating_sub(2 * inset));
    let height = window.height.saturating_sub(2 * inset);
    let right = i64::from(window.x) + i64::from(window.width) - i64::from(inset);
    Rect {
        x: saturate(right - i64::from(width)),
        y: saturate(i64::from(window.y) + i64::from(inset)),
        width,
        height,
    }
}

/// Index of the monitor containing `cursor` (physical px), else the nearest one.
pub fn pick_monitor(cursor: (f64, f64), monitors: &[Rect]) -> Option<usize> {
    monitors
        .iter()
        .position(|monitor| monitor.contains(cursor.0, cursor.1))
        .or_else(|| {
            monitors
                .iter()
                .enumerate()
                .min_by(|(_, a), (_, b)| {
                    a.distance_sq(cursor.0, cursor.1)
                        .total_cmp(&b.distance_sq(cursor.0, cursor.1))
                })
                .map(|(index, _)| index)
        })
}

/// The window rectangle (physical px) anchored to the bottom-right of `work_area`.
///
/// `logical` is the wanted size in logical px and `scale` the monitor's scale factor. The
/// result is shrunk to fit small work areas and never leaves them.
pub fn anchor_bottom_right(work_area: Rect, scale: f64, logical: (f64, f64), margin: f64) -> Rect {
    let scale = if scale.is_finite() && scale > 0.0 {
        scale
    } else {
        1.0
    };
    let margin_px = to_px(margin * scale);
    let max_width = work_area.width.saturating_sub(2 * margin_px).max(1);
    let max_height = work_area.height.saturating_sub(2 * margin_px).max(1);
    let width = to_px(logical.0 * scale).clamp(1, max_width);
    let height = to_px(logical.1 * scale).clamp(1, max_height);
    let right = i64::from(work_area.x) + i64::from(work_area.width) - i64::from(margin_px);
    let bottom = i64::from(work_area.y) + i64::from(work_area.height) - i64::from(margin_px);
    Rect {
        x: saturate(right - i64::from(width)),
        y: saturate(bottom - i64::from(height)),
        width,
        height,
    }
}

/// Logical size of the tray menu window: room for the menu (272 px) plus one submenu beside it,
/// and a transparent margin for the popups' shadows. The UI draws the menu in one corner.
pub const TRAY_MENU_SIZE: (f64, f64) = (560.0, 440.0);

/// Where the tray menu window goes and where, inside it, the menu is anchored.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TrayMenuPlacement {
    /// The window (physical px), inside the work area.
    pub window: Rect,
    /// The menu's anchor point relative to the window (logical px).
    pub anchor: (f64, f64),
    /// The menu opens upwards (tray at the bottom of the screen).
    pub opens_up: bool,
    /// The menu's right edge sits on the anchor (tray on the right of the screen).
    pub align_end: bool,
}

/// Places the tray menu next to the cursor that right-clicked the tray icon.
///
/// The menu opens away from the screen edge the tray is on: up from a bottom taskbar, down from
/// a top menu bar, and towards the screen's centre horizontally. The anchor is clamped into the
/// work area, so a cursor on the taskbar anchors the menu to the taskbar's edge.
pub fn tray_menu_placement(
    cursor: (f64, f64),
    monitor: Rect,
    work_area: Rect,
    scale: f64,
    logical: (f64, f64),
) -> TrayMenuPlacement {
    let scale = if scale.is_finite() && scale > 0.0 {
        scale
    } else {
        1.0
    };
    let width = to_px(logical.0 * scale).clamp(1, work_area.width.max(1));
    let height = to_px(logical.1 * scale).clamp(1, work_area.height.max(1));
    let opens_up = cursor.1 >= f64::from(monitor.y) + f64::from(monitor.height) / 2.0;
    let align_end = cursor.0 >= f64::from(monitor.x) + f64::from(monitor.width) / 2.0;

    let left = f64::from(work_area.x);
    let top = f64::from(work_area.y);
    let right = left + f64::from(work_area.width);
    let bottom = top + f64::from(work_area.height);
    let point = (cursor.0.clamp(left, right), cursor.1.clamp(top, bottom));

    let x = if align_end {
        point.0 - f64::from(width)
    } else {
        point.0
    };
    let y = if opens_up {
        point.1 - f64::from(height)
    } else {
        point.1
    };
    let x = x.clamp(left, (right - f64::from(width)).max(left)).round();
    let y = y.clamp(top, (bottom - f64::from(height)).max(top)).round();
    TrayMenuPlacement {
        window: Rect {
            x: saturate_f64(x),
            y: saturate_f64(y),
            width,
            height,
        },
        anchor: ((point.0 - x) / scale, (point.1 - y) / scale),
        opens_up,
        align_end,
    }
}

#[allow(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "window sizes are small positive numbers, rounded and clamped first"
)]
fn to_px(value: f64) -> u32 {
    value.round().clamp(0.0, f64::from(u32::MAX)) as u32
}

#[allow(
    clippy::cast_possible_truncation,
    reason = "screen coordinates are rounded and clamped to the i32 range first"
)]
fn saturate_f64(value: f64) -> i32 {
    value
        .round()
        .clamp(f64::from(i32::MIN), f64::from(i32::MAX)) as i32
}

fn saturate(value: i64) -> i32 {
    i32::try_from(value).unwrap_or(if value < 0 { i32::MIN } else { i32::MAX })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FULL_HD: Rect = Rect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1040, // 40 px taskbar
    };

    #[test]
    fn anchors_above_the_taskbar_with_a_margin() {
        let rect = anchor_bottom_right(FULL_HD, 1.0, (460.0, 660.0), 12.0);
        assert_eq!(
            rect,
            Rect {
                x: 1920 - 12 - 460,
                y: 1040 - 12 - 660,
                width: 460,
                height: 660
            }
        );
    }

    #[test]
    fn scales_to_physical_pixels() {
        let work = Rect {
            x: 0,
            y: 0,
            width: 3840,
            height: 2080,
        };
        let rect = anchor_bottom_right(work, 1.5, (460.0, 660.0), 12.0);
        assert_eq!((rect.width, rect.height), (690, 990));
        assert_eq!(rect.x + i32::try_from(rect.width).unwrap_or(0) + 18, 3840);
    }

    #[test]
    fn works_on_secondary_monitors_left_of_primary() {
        let work = Rect {
            x: -1280,
            y: 200,
            width: 1280,
            height: 984,
        };
        let rect = anchor_bottom_right(work, 1.0, (460.0, 660.0), 12.0);
        assert_eq!(rect.x, -12 - 460);
        assert_eq!(rect.y, 200 + 984 - 12 - 660);
    }

    #[test]
    fn shrinks_to_fit_tiny_screens() {
        let work = Rect {
            x: 0,
            y: 0,
            width: 800,
            height: 560,
        };
        let rect = anchor_bottom_right(work, 1.0, (920.0, 760.0), 12.0);
        assert_eq!(
            (rect.x, rect.y, rect.width, rect.height),
            (12, 12, 776, 536)
        );
    }

    #[test]
    fn picks_the_monitor_under_the_cursor_or_the_nearest() {
        let monitors = [
            Rect {
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
            },
            Rect {
                x: 1920,
                y: 0,
                width: 2560,
                height: 1440,
            },
        ];
        assert_eq!(pick_monitor((100.0, 100.0), &monitors), Some(0));
        assert_eq!(pick_monitor((2000.0, 1300.0), &monitors), Some(1));
        assert_eq!(pick_monitor((5000.0, 100.0), &monitors), Some(1));
        assert_eq!(pick_monitor((0.0, 0.0), &[]), None);
    }

    #[test]
    fn window_is_expanded_width_plus_insets() {
        assert_eq!(window_size(SizePreset::S), (952.0, 592.0));
        assert_eq!(window_size(SizePreset::L), (952.0, 772.0));
    }

    #[test]
    fn frame_hugs_the_right_edge_inside_the_inset() {
        let window = Rect {
            x: 1000,
            y: 300,
            width: 952,
            height: 672,
        };
        let normal = frame_rect(window, 1.0, false);
        assert_eq!(
            (normal.x, normal.y, normal.width, normal.height),
            (1000 + 952 - 16 - 460, 316, 460, 640)
        );
        assert!(normal.contains(1900.0, 400.0));
        assert!(
            !normal.contains(1100.0, 400.0),
            "left of the frame is click-through"
        );
        let expanded = frame_rect(window, 1.0, true);
        assert_eq!(expanded.width, 920);
        assert!(expanded.contains(1100.0, 400.0));
        let hidpi = frame_rect(
            Rect {
                x: 0,
                y: 0,
                width: 1428,
                height: 1008,
            },
            1.5,
            false,
        );
        assert_eq!((hidpi.x, hidpi.width), (1428 - 24 - 690, 690));
    }
    #[test]
    fn tray_menu_opens_up_and_left_from_a_bottom_right_taskbar() {
        let monitor = Rect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        // Cursor on the taskbar, below the work area.
        let placement =
            tray_menu_placement((1800.0, 1060.0), monitor, FULL_HD, 1.0, TRAY_MENU_SIZE);
        assert!(placement.opens_up && placement.align_end);
        assert_eq!(
            placement.window,
            Rect {
                x: 1800 - 560,
                y: 1040 - 440,
                width: 560,
                height: 440
            }
        );
        assert_eq!(placement.anchor, (560.0, 440.0));
    }

    #[test]
    fn tray_menu_opens_down_from_a_top_menu_bar() {
        let monitor = Rect {
            x: 0,
            y: 0,
            width: 2880,
            height: 1800,
        };
        let work = Rect {
            x: 0,
            y: 50,
            width: 2880,
            height: 1750,
        };
        let placement = tray_menu_placement((2500.0, 20.0), monitor, work, 2.0, TRAY_MENU_SIZE);
        assert!(!placement.opens_up && placement.align_end);
        assert_eq!(
            placement.window,
            Rect {
                x: 2500 - 1120,
                y: 50,
                width: 1120,
                height: 880
            }
        );
        assert_eq!(placement.anchor, (560.0, 0.0));
    }

    #[test]
    fn tray_menu_stays_inside_the_work_area_near_a_corner() {
        let monitor = Rect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        // A left-hand taskbar: the menu opens to the right, clamped to the work area's left edge.
        let work = Rect {
            x: 60,
            y: 0,
            width: 1860,
            height: 1080,
        };
        let placement = tray_menu_placement((30.0, 1000.0), monitor, work, 1.0, TRAY_MENU_SIZE);
        assert!(placement.opens_up && !placement.align_end);
        assert_eq!((placement.window.x, placement.window.y), (60, 1000 - 440));
        assert_eq!(placement.anchor, (0.0, 440.0));
        // Near the top-left corner, the window can't go above the work area.
        let high = tray_menu_placement((100.0, 700.0), monitor, work, 1.0, (560.0, 900.0));
        assert_eq!(high.window.y, 0);
        assert_eq!(high.anchor, (0.0, 700.0));
    }
}
