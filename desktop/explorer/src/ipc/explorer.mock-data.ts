/**
 * The sample file system the browser mock starts with: a plausible home folder with every
 * kind of file, so each view, preview and menu can be designed without the desktop app.
 */

export const MOCK_HOME = '/home/genslate';
export const MOCK_USB = '/media/GENSLATE';

const DAY = 86_400_000;

/** One file or folder of the sample tree. `age` is days since it was modified. */
export interface MockSeed {
  readonly path: string;
  readonly dir?: boolean;
  readonly size?: number;
  readonly age?: number;
  readonly text?: string;
}

const README = `# GENSLATE Suite

Portable, AI-native apps that live on your drive and go where you go.

## Apps
- **Launcher**: every app one keystroke away
- **Explorer**: browse, search and manage your files
- **Editor**, **Terminal**, **Gallery** and more

> Everything runs from the folder it lives in. Nothing is installed.
`;

const MAIN_RS = `//! GENSLATE Suite build helper.

use std::path::Path;

fn main() -> std::io::Result<()> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    for app in ["launcher", "explorer", "editor"] {
        println!("building {app} from {}", root.display());
    }
    Ok(())
}
`;

const NOTES = `Weekly notes

- Ship the Explorer preview pane
- Review the launcher tray menu on Windows
- Plan the AI assistant: summaries, smart folders, chat about files
- Back up the Photos folder to the USB drive
`;

const CONFIG = `[explorer]
view = "details"
sort-by = "name"
show-hidden = false
`;

const photos = Array.from({ length: 14 }, (_, index) => ({
  path: `${MOCK_HOME}/Pictures/Vacation 2026/IMG_${String(2040 + index).padStart(4, '0')}.jpg`,
  size: 2_400_000 + index * 173_000,
  age: 40 + index,
}));

const screenshots = Array.from({ length: 6 }, (_, index) => ({
  path: `${MOCK_HOME}/Pictures/Screenshots/Screenshot 2026-09-${String(20 + index).padStart(2, '0')}.png`,
  size: 380_000 + index * 41_000,
  age: 7 - index,
}));

export const MOCK_SEEDS: readonly MockSeed[] = [
  { path: `${MOCK_HOME}/Desktop`, dir: true, age: 1 },
  { path: `${MOCK_HOME}/Desktop/Welcome.md`, text: README, age: 1 },
  { path: `${MOCK_HOME}/Desktop/Quick notes.txt`, text: NOTES, age: 0 },
  { path: `${MOCK_HOME}/Documents`, dir: true, age: 0 },
  { path: `${MOCK_HOME}/Documents/Invoices`, dir: true, age: 3 },
  { path: `${MOCK_HOME}/Documents/Invoices/Invoice 2026-01.pdf`, size: 184_220, age: 240 },
  { path: `${MOCK_HOME}/Documents/Invoices/Invoice 2026-02.pdf`, size: 190_004, age: 210 },
  { path: `${MOCK_HOME}/Documents/Invoices/Invoice 2026-03.pdf`, size: 201_870, age: 180 },
  { path: `${MOCK_HOME}/Documents/Invoices/Invoice 2026-10.pdf`, size: 176_330, age: 3 },
  { path: `${MOCK_HOME}/Documents/Projects`, dir: true, age: 0 },
  { path: `${MOCK_HOME}/Documents/Projects/GENSLATE Suite`, dir: true, age: 0 },
  { path: `${MOCK_HOME}/Documents/Projects/GENSLATE Suite/README.md`, text: README, age: 0 },
  { path: `${MOCK_HOME}/Documents/Projects/GENSLATE Suite/main.rs`, text: MAIN_RS, age: 2 },
  { path: `${MOCK_HOME}/Documents/Projects/GENSLATE Suite/config.toml`, text: CONFIG, age: 5 },
  { path: `${MOCK_HOME}/Documents/Projects/GENSLATE Suite/logo.svg`, size: 4_210, age: 9 },
  { path: `${MOCK_HOME}/Documents/Projects/Website`, dir: true, age: 12 },
  {
    path: `${MOCK_HOME}/Documents/Projects/Website/index.html`,
    text: '<!doctype html>\n<title>GENSLATE</title>\n',
    age: 12,
  },
  { path: `${MOCK_HOME}/Documents/Budget 2026.xlsx`, size: 48_512, age: 6 },
  { path: `${MOCK_HOME}/Documents/Contract (signed).docx`, size: 92_160, age: 31 },
  { path: `${MOCK_HOME}/Documents/Meeting notes.md`, text: NOTES, age: 0 },
  { path: `${MOCK_HOME}/Documents/Roadmap Q4.pptx`, size: 3_145_728, age: 2 },
  { path: `${MOCK_HOME}/Documents/Resume.pdf`, size: 256_004, age: 64 },
  { path: `${MOCK_HOME}/Documents/Tax return 2025.pdf`, size: 1_048_576, age: 150 },
  { path: `${MOCK_HOME}/Downloads`, dir: true, age: 1 },
  { path: `${MOCK_HOME}/Downloads/genslate-suite-0.1.0.zip`, size: 84_934_656, age: 1 },
  { path: `${MOCK_HOME}/Downloads/ubuntu-26.04-desktop-amd64.iso`, size: 6_174_015_488, age: 20 },
  { path: `${MOCK_HOME}/Downloads/Inter-4.1.zip`, size: 12_582_912, age: 44 },
  { path: `${MOCK_HOME}/Downloads/wallpaper-aurora.png`, size: 5_242_880, age: 8 },
  { path: `${MOCK_HOME}/Downloads/podcast-episode-42.mp3`, size: 62_914_560, age: 4 },
  { path: `${MOCK_HOME}/Downloads/setup.exe`, size: 3_670_016, age: 90 },
  { path: `${MOCK_HOME}/Music`, dir: true, age: 30 },
  { path: `${MOCK_HOME}/Music/Northern Lights`, dir: true, age: 30 },
  { path: `${MOCK_HOME}/Music/Northern Lights/01 Aurora.flac`, size: 31_457_280, age: 30 },
  { path: `${MOCK_HOME}/Music/Northern Lights/02 Polar Night.flac`, size: 28_311_552, age: 30 },
  { path: `${MOCK_HOME}/Music/Northern Lights/03 Snow Storm.flac`, size: 33_554_432, age: 30 },
  { path: `${MOCK_HOME}/Pictures`, dir: true, age: 2 },
  { path: `${MOCK_HOME}/Pictures/Screenshots`, dir: true, age: 2 },
  { path: `${MOCK_HOME}/Pictures/Vacation 2026`, dir: true, age: 40 },
  ...photos,
  ...screenshots,
  { path: `${MOCK_HOME}/Pictures/Profile.png`, size: 842_000, age: 70 },
  { path: `${MOCK_HOME}/Videos`, dir: true, age: 15 },
  { path: `${MOCK_HOME}/Videos/Product demo.mp4`, size: 524_288_000, age: 15 },
  { path: `${MOCK_HOME}/Videos/Drone flight.mov`, size: 1_288_490_188, age: 45 },
  { path: `${MOCK_HOME}/.config`, dir: true, age: 3 },
  { path: `${MOCK_HOME}/.config/genslate.toml`, text: CONFIG, age: 3 },
  { path: `${MOCK_HOME}/.profile`, text: 'export EDITOR=genslate-editor\n', age: 100 },
  { path: `${MOCK_USB}/GENSLATE Suite`, dir: true, age: 1 },
  { path: `${MOCK_USB}/GENSLATE Suite/Launcher.exe`, size: 9_437_184, age: 1 },
  { path: `${MOCK_USB}/GENSLATE Suite/Explorer.exe`, size: 11_534_336, age: 1 },
  { path: `${MOCK_USB}/Backups`, dir: true, age: 9 },
];

/** Milliseconds for "`age` days ago" at a fixed time of day (stable screenshots). */
export function mockTime(now: number, age: number): number {
  const today = new Date(now);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 24).getTime();
  return base - age * DAY - (age % 5) * 3_600_000;
}
