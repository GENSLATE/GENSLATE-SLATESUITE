import type { CodiconRef } from '@genslate/design-system';

/**
 * The GENSLATE suite as the website presents it. `name`, `tagline`, `category`, `color` and
 * `keywords` mirror `other/config/appdata/metadata/<id>.toml` (what the launcher shows) — a unit
 * test keeps them in sync. Everything else is website copy.
 */

export type AppCategory =
  | 'System'
  | 'Development'
  | 'Office'
  | 'Internet'
  | 'Media'
  | 'Utilities'
  | 'AI';

/** `preview`: builds from source today · `planned`: designed, not built yet. */
export type AppStatus = 'preview' | 'planned';

export type NordColor =
  `nord${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15}`;

export interface AppFeature {
  readonly icon: CodiconRef;
  readonly title: string;
  readonly body: string;
}

export interface SuiteApp {
  /** Folder name under `desktop/` and in `programs/genslate/`. */
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly category: AppCategory;
  readonly color: NordColor;
  readonly keywords: readonly string[];
  readonly status: AppStatus;
  /** Big line on the app page. */
  readonly headline: string;
  readonly summary: string;
  readonly features: readonly AppFeature[];
  /** Wiki page with the full guide, when there is one. */
  readonly guide?: string;
}

export const APPS: readonly SuiteApp[] = [
  {
    id: 'launcher',
    name: 'Launcher',
    tagline: 'Your portable GENSLATE apps, files and tools in one menu',
    category: 'System',
    color: 'nord8',
    keywords: ['menu', 'start', 'apps'],
    status: 'preview',
    headline: 'One keystroke to every app you carry.',
    summary:
      'The Launcher is the home of the suite: a start menu that lives in your tray, opens with a global shortcut and finds any app, folder or command as you type. It runs GENSLATE apps, PortableApps.com apps and portapps.io apps side by side — straight from a USB drive if you like.',
    guide: 'launcher',
    features: [
      {
        icon: 'codicon:search',
        title: 'Type to launch',
        body: 'Fuzzy search across every app, with favourites, recents and categories one arrow key away.',
      },
      {
        icon: 'codicon:terminal-cmd',
        title: 'Slash commands',
        body: 'Type / for open, folder, theme, size, pin, rescan and more — the same vocabulary the tray and future AI agents use.',
      },
      {
        icon: 'codicon:layers',
        title: 'Three app sources',
        body: 'GENSLATE, PortableApps.com and portapps.io apps in their own tabs, icons extracted automatically.',
      },
      {
        icon: 'codicon:keyboard',
        title: 'Keyboard first',
        body: 'Ctrl+Alt+Space from anywhere, then Ctrl+1–3 for tabs, Ctrl+D to favourite, Ctrl+P to pin.',
      },
      {
        icon: 'codicon:folder-library',
        title: 'Your portable folders',
        body: 'Desktop, Documents, Downloads, Music, Pictures and Videos travel with the suite, not the PC.',
      },
      {
        icon: 'codicon:settings',
        title: 'Plain-text settings',
        body: 'config.toml and keybindings.toml, hot-reloaded the moment you save.',
      },
    ],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    tagline: 'A fast, modern terminal with tabs and splits',
    category: 'Development',
    color: 'nord14',
    keywords: ['shell', 'console', 'command line', 'cli'],
    status: 'planned',
    headline: 'A terminal that feels like it belongs on your Mac — everywhere.',
    summary:
      'GPU-friendly rendering, tabs and splits, profiles for every shell you use and a command palette for everything else. Nord colours out of the box, and it remembers your sessions without ever touching the host machine.',
    guide: 'terminal',
    features: [
      {
        icon: 'codicon:split-horizontal',
        title: 'Tabs and splits',
        body: 'Split any pane horizontally or vertically and move between them from the keyboard.',
      },
      {
        icon: 'codicon:terminal-bash',
        title: 'Every shell',
        body: 'PowerShell, cmd, bash, zsh, fish and WSL profiles, detected automatically.',
      },
      {
        icon: 'codicon:symbol-color',
        title: 'Nord, tuned',
        body: 'Polar Night and Snow Storm palettes with contrast checked for every ANSI colour.',
      },
      {
        icon: 'codicon:history',
        title: 'Portable history',
        body: 'Profiles, history and layouts live in the suite folder and follow you between PCs.',
      },
    ],
  },
  {
    id: 'explorer',
    name: 'Explorer',
    tagline: 'Browse, search and manage your files',
    category: 'System',
    color: 'nord8',
    keywords: ['files', 'folders', 'file manager'],
    status: 'planned',
    headline: 'Your files, in a Finder-calm window with VS Code speed.',
    summary:
      'A source-list sidebar, instant search, tabs, a quick-look preview and batch rename. Explorer opens your portable folders first, so the files on your drive feel like home on any computer.',
    guide: 'explorer',
    features: [
      {
        icon: 'codicon:list-tree',
        title: 'Tree, list and grid',
        body: 'Switch views per folder; column widths and sort orders are remembered.',
      },
      {
        icon: 'codicon:search-fuzzy',
        title: 'Search as you type',
        body: 'Fuzzy file-name search across the current folder tree, with filters for kind and size.',
      },
      {
        icon: 'codicon:eye',
        title: 'Quick look',
        body: 'Space previews images, text, Markdown and code without opening another app.',
      },
      {
        icon: 'codicon:replace-all',
        title: 'Batch rename',
        body: 'Rename hundreds of files with patterns and a live preview of every result.',
      },
    ],
  },
  {
    id: 'editor',
    name: 'Editor',
    tagline: 'Write and edit notes, text and Markdown',
    category: 'Office',
    color: 'nord9',
    keywords: ['text', 'notes', 'markdown', 'writer'],
    status: 'planned',
    headline: 'Distraction-free writing with Markdown superpowers.',
    summary:
      'A calm writing surface for notes, docs and plain text: live Markdown preview, an outline, focus mode and a notes library that stays on your drive.',
    features: [
      {
        icon: 'codicon:markdown',
        title: 'Markdown, live',
        body: 'Write on the left, see it rendered on the right — or together in one pane.',
      },
      {
        icon: 'codicon:list-flat',
        title: 'Outline',
        body: 'Every heading in a sidebar; drag to reorder whole sections.',
      },
      {
        icon: 'codicon:zen-mode',
        title: 'Focus mode',
        body: 'Hide the chrome, dim everything but the current paragraph.',
      },
      {
        icon: 'codicon:notebook',
        title: 'Notes library',
        body: 'Folders, tags and full-text search over plain .md files you own.',
      },
    ],
  },
  {
    id: 'coder',
    name: 'Coder',
    tagline: 'A focused code editor for your projects',
    category: 'Development',
    color: 'nord10',
    keywords: ['code', 'ide', 'programming'],
    status: 'planned',
    headline: 'The editor you know, trimmed to what you use.',
    summary:
      'Tabs, a file tree, a command palette, fast search and syntax colours built on the same Nord tokens as the rest of the suite. Portable, quick to open and happy on a USB stick.',
    features: [
      {
        icon: 'codicon:symbol-method',
        title: 'Syntax for 200+ languages',
        body: 'Accurate TextMate grammars with Nord colours designed for long sessions.',
      },
      {
        icon: 'codicon:go-to-file',
        title: 'Go to anything',
        body: 'Ctrl+P for files, Ctrl+Shift+P for commands, Ctrl+Shift+F to search the project.',
      },
      {
        icon: 'codicon:git-branch',
        title: 'Git at a glance',
        body: 'Changed files, the current branch and inline diff gutters.',
      },
      {
        icon: 'codicon:terminal',
        title: 'Built-in terminal',
        body: 'The GENSLATE Terminal, docked in a panel under your code.',
      },
    ],
  },
  {
    id: 'browser',
    name: 'Browser',
    tagline: 'A private, portable web browser',
    category: 'Internet',
    color: 'nord7',
    keywords: ['web', 'internet', 'www'],
    status: 'planned',
    headline: 'Browse without leaving a trace on the PC.',
    summary:
      'Your bookmarks, sessions and settings live in the suite folder; nothing is written to the host. Clean tabs, a reader view and tracking protection on by default.',
    features: [
      {
        icon: 'codicon:shield',
        title: 'Private by default',
        body: 'Tracker blocking, no telemetry, and a profile that never leaves your drive.',
      },
      {
        icon: 'codicon:book',
        title: 'Reader view',
        body: 'Articles re-typeset in Inter with Nord colours — no clutter.',
      },
      {
        icon: 'codicon:bookmark',
        title: 'Portable bookmarks',
        body: 'Bookmarks and history in plain files inside the suite folder.',
      },
      {
        icon: 'codicon:layout-sidebar-left',
        title: 'Vertical tabs',
        body: 'Optional sidebar tabs that scale to hundreds of pages.',
      },
    ],
  },
  {
    id: 'gallery',
    name: 'Gallery',
    tagline: 'View and organise your photos and images',
    category: 'Media',
    color: 'nord15',
    keywords: ['photos', 'images', 'pictures', 'viewer'],
    status: 'planned',
    headline: 'Your photos, beautifully out of the way.',
    summary:
      'A fast grid over your Pictures folder, a full-screen viewer, albums and metadata — with the photos themselves always front and centre.',
    features: [
      {
        icon: 'codicon:layout',
        title: 'Justified grid',
        body: 'Rows that respect every aspect ratio, virtualised for libraries of any size.',
      },
      {
        icon: 'codicon:screen-full',
        title: 'Viewer',
        body: 'Full-screen, zoom, compare and slideshow, all from the keyboard.',
      },
      {
        icon: 'codicon:folder-library',
        title: 'Albums',
        body: 'Smart albums by date, camera or folder, stored beside your photos.',
      },
      {
        icon: 'codicon:info',
        title: 'Metadata',
        body: 'EXIF, dimensions and location, editable in a side inspector.',
      },
    ],
  },
  {
    id: 'jukebox',
    name: 'Jukebox',
    tagline: 'Play your music library and playlists',
    category: 'Media',
    color: 'nord11',
    keywords: ['music', 'audio', 'player', 'mp3'],
    status: 'planned',
    headline: 'Your music library, on any computer you plug into.',
    summary:
      'Albums, artists and playlists from the Music folder on your drive, gapless playback, a mini player and media keys — no cloud account required.',
    features: [
      {
        icon: 'codicon:library',
        title: 'Library',
        body: 'Browse by album, artist, genre or folder with cover art everywhere.',
      },
      {
        icon: 'codicon:play-circle',
        title: 'Gapless playback',
        body: 'MP3, FLAC, AAC, Ogg and WAV, with ReplayGain and a 10-band equaliser.',
      },
      {
        icon: 'codicon:list-ordered',
        title: 'Playlists',
        body: 'Smart and manual playlists, saved as portable .m3u8 files.',
      },
      {
        icon: 'codicon:screen-normal',
        title: 'Mini player',
        body: 'A compact always-on-top player that stays out of your way.',
      },
    ],
  },
  {
    id: 'theater',
    name: 'Theater',
    tagline: 'Watch videos and movies',
    category: 'Media',
    color: 'nord12',
    keywords: ['video', 'movies', 'player'],
    status: 'planned',
    headline: 'A cinema-dark player for everything in your Videos folder.',
    summary:
      'Play local videos with subtitles, chapters and resume points, in a window whose chrome fades away the moment the film starts.',
    features: [
      {
        icon: 'codicon:play',
        title: 'Plays what you have',
        body: 'Common containers and codecs, subtitles and multiple audio tracks.',
      },
      {
        icon: 'codicon:history',
        title: 'Resume anywhere',
        body: 'Picks up where you stopped, even on another PC.',
      },
      {
        icon: 'codicon:list-unordered',
        title: 'Chapters',
        body: 'Jump between chapters from a scrubber with thumbnails.',
      },
      {
        icon: 'codicon:screen-full',
        title: 'Chrome that disappears',
        body: 'Controls fade out while you watch and return when you move.',
      },
    ],
  },
  {
    id: 'command',
    name: 'Command',
    tagline: 'Run commands and automations from one bar',
    category: 'Utilities',
    color: 'nord3',
    keywords: ['commands', 'palette', 'automation', 'run'],
    status: 'planned',
    headline: 'A command palette for your whole computer.',
    summary:
      'One bar for scripts, snippets, calculations and app actions. Chain commands into automations and trigger them from a shortcut or the Launcher.',
    features: [
      {
        icon: 'codicon:symbol-event',
        title: 'Actions from every app',
        body: 'GENSLATE apps expose their commands to one shared registry.',
      },
      {
        icon: 'codicon:run-all',
        title: 'Automations',
        body: 'Chain steps with inputs and outputs, saved as readable TOML.',
      },
      {
        icon: 'codicon:symbol-numeric',
        title: 'Inline answers',
        body: 'Maths, unit and colour conversions right in the bar.',
      },
      {
        icon: 'codicon:record-keys',
        title: 'Hotkeys',
        body: 'Bind any command or automation to a global shortcut.',
      },
    ],
  },
  {
    id: 'toolbox',
    name: 'Toolbox',
    tagline: 'Handy utilities for everyday tasks',
    category: 'Utilities',
    color: 'nord13',
    keywords: ['tools', 'utilities', 'converter'],
    status: 'planned',
    headline: 'The small tools you reach for every day, in one place.',
    summary:
      'Converters, encoders, hashing, a colour picker, JSON and regex tools — all offline, all in one tidy window.',
    features: [
      {
        icon: 'codicon:json',
        title: 'Formatters',
        body: 'JSON, TOML, YAML and XML: format, validate and convert.',
      },
      {
        icon: 'codicon:regex',
        title: 'Regex lab',
        body: 'Test expressions against sample text with live match highlighting.',
      },
      {
        icon: 'codicon:key',
        title: 'Hash and encode',
        body: 'SHA-256, Base64, URL and UUID tools, entirely offline.',
      },
      {
        icon: 'codicon:symbol-color',
        title: 'Colour picker',
        body: 'Pick from the screen and convert between hex, RGB, HSL and OKLCH.',
      },
    ],
  },
  {
    id: 'aistudio',
    name: 'AI Studio',
    tagline: 'Chat, create and automate with AI models',
    category: 'AI',
    color: 'nord0',
    keywords: ['ai', 'chat', 'assistant', 'llm'],
    status: 'planned',
    headline: 'Your AI workspace — with the files and tools you already carry.',
    summary:
      'Chat with the models you choose, attach files from your portable folders and let the assistant run GENSLATE commands for you, with every action shown before it happens.',
    features: [
      {
        icon: 'codicon:comment-discussion',
        title: 'Chat',
        body: 'Conversations with attachments, code blocks and Markdown answers.',
      },
      {
        icon: 'codicon:tools',
        title: 'Uses your tools',
        body: 'The shared command registry lets the assistant open apps, folders and files.',
      },
      {
        icon: 'codicon:server-process',
        title: 'Bring your model',
        body: 'Cloud APIs or local models; keys stay in your suite folder.',
      },
      {
        icon: 'codicon:shield',
        title: 'You approve',
        body: 'Every action is previewed and needs your go-ahead.',
      },
    ],
  },
  {
    id: 'example',
    name: 'Design Kit',
    tagline: 'Design Kit showcase: every component in both Nord themes',
    category: 'Development',
    color: 'nord9',
    keywords: ['design', 'components', 'showcase', 'kit'],
    status: 'preview',
    headline: 'Every component, every state, both themes.',
    summary:
      'The living catalogue of the GENSLATE design system: foundations, window chrome, layout, inputs, overlays and feedback, each with a state matrix and copyable code. It is how every GENSLATE app gets its look.',
    guide: 'design-kit',
    features: [
      {
        icon: 'codicon:symbol-color',
        title: 'Official Nord',
        body: 'Polar Night and Snow Storm themes generated from one typed token source.',
      },
      {
        icon: 'codicon:layout',
        title: '50+ components',
        body: 'Built on Base UI and Tailwind CSS v4: accessible, keyboard-complete, dense.',
      },
      {
        icon: 'codicon:table',
        title: 'State matrices',
        body: 'Rest, hover, pressed, focus, disabled and loading, side by side.',
      },
      {
        icon: 'codicon:copy',
        title: 'Copy the code',
        body: 'Every example ships with the JSX that produced it.',
      },
    ],
  },
];

/** The display name of the design-kit app's metadata entry differs on purpose. */
export const METADATA_NAME_OVERRIDES: Readonly<Record<string, string>> = { example: 'Example' };

export function findApp(id: string): SuiteApp | undefined {
  return APPS.find((app) => app.id === id);
}

export const CATEGORY_ORDER: readonly AppCategory[] = [
  'System',
  'Development',
  'Office',
  'Internet',
  'Media',
  'Utilities',
  'AI',
];

/** Codicon for each category. */
export const CATEGORY_ICONS: Readonly<Record<AppCategory, CodiconRef>> = {
  System: 'codicon:server',
  Development: 'codicon:code',
  Office: 'codicon:file-text',
  Internet: 'codicon:globe',
  Media: 'codicon:device-camera-video',
  Utilities: 'codicon:tools',
  AI: 'codicon:sparkle',
};
