// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    genslate_{{ name | replace(from="-", to="_") }}_lib::run();
}
