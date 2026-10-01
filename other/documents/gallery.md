# GENSLATE Gallery

A fast, private photo and video library for the folders you already have: a timeline, grid and
details view, a viewer with a film strip, non-destructive edits, albums, tags, places, duplicates
and export. Nothing leaves the machine. The AI features are visible as previews ("Coming soon")
but do nothing yet.

Run it with `bun x moon run gallery:dev` (native window, real folders) or
`bun x moon run gallery:web-dev` (plain browser on port 1436, backed by a sample library of 135
drawn photos and videos).

## What it does

| Area | Features |
|---|---|
| Library | Add any folders (the Pictures folder is offered on first run); they are scanned on every core and watched, so new, changed, moved and deleted files show up without a rescan. JPEG, PNG, WebP, GIF, BMP, TIFF, JPEG XL, SVG, HEIC, AVIF and RAW, plus MP4, MOV, WebM, MKV and AVI |
| Views | Timeline (justified rows grouped by day, month or year, with a date scrubber), grid (square tiles) and details (sortable columns); zoom with `Ctrl+=` / `Ctrl+-`; sort by date taken, date added, name or size |
| Collections | All photos, Favorites, Videos, Screenshots, Recently added, Edited, Trash; albums; tags; folders; places (country ▸ city, looked up offline) |
| Viewer | Arrows and the film strip to move, zoom and pan, video playback, favorite and 1–5 stars, compare two photos side by side, slideshow (full screen, adjustable speed) |
| Info panel | Date taken, camera, lens, exposure, size, place and folder links, tags you can add and remove; a summary of a multiple selection or of the whole library |
| Edits | Rotate, flip, straighten, crop (free or 1:1, 4:3, 3:2, 16:9, original) and light / contrast / saturation / warmth, previewed live and saved as a copy next to the original; the original is never written |
| Files | Rename, move, copy, export (original, or JPEG / PNG at a chosen size and quality), reveal in the file manager, open in the default app, Trash with Put back, Undo |
| Duplicates | Exact copies (same bytes) and look-alikes (burst shots, resized copies); keeps the best of each group and moves the extras to the Trash in one click |
| Everywhere | Search (names, places, cameras, tags), command palette (`Ctrl+K`), right-click menus per area, settings (`Ctrl+,`), shortcuts sheet (`F1`), status bar with counts, selection, scan progress and background tasks |

`Ctrl` is `⌘` on macOS. In a collection, `Enter` opens, `E` edits, `F` favorites, `1`–`5` rate
(`0` clears), `T` adds a tag, `F2` renames, `Delete` moves to the Trash, `S` starts a slideshow
and `C` compares two photos.

## AI previews

Nothing here calls a model yet. The previews show where the assistant will live:

- the sparkle button in the titlebar (**Ask**) and the search field's sparkle (search by
  describing a photo);
- the **People**, **Memories** and **Assistant** side-panel tabs;
- the **Describe** card in the info panel (a caption and suggested tags);
- **Smart edits** in the editor (auto-enhance, remove background, erase an object, upscale,
  relight) and **Smart actions** in the right-click menu;
- the palette's "AI (coming soon)" group.

They come from the command registry's `soon` entries and the side panel's `preview` panels.
Everything is meant to run on the device; conversations and memories will be kept in the suite's
shared AI database (see Storage), which already exists.

## How it is built

```
crates/core/gallery/            the whole library, plain Rust, unit-tested
  library.rs                      library.sqlite: folders, items, albums, tags, Trash, FTS5 search
  scan.rs  watch.rs               ignore (walker) + rayon; notify-debouncer-full
  metadata.rs  places.rs          nom-exif + imagesize; reverse_geocoder (offline)
  thumbnail.rs                    image, jxl-oxide, resvg → fast_image_resize → disk cache
  duplicates.rs                   blake3 (exact) + image_hasher (look-alikes)
  edit.rs  export.rs              non-destructive edits; re-encoded exports without metadata
  trash.rs  names.rs  kind.rs     trash crate, safe file names, format table
  config.rs                       [gallery] section, written back with toml_edit
desktop/gallery/src-tauri/      thin shell: IPC commands, gallery-thumb:// and gallery-media://
                                schemes, background tasks with progress events
desktop/gallery/src/            React UI (features/*), typed IPC with a browser mock (ipc/*),
                                layout and edit maths (model/*)
```

The editor's live preview uses the same maths as `edit.rs`: a CSS transform for rotate, flip and
straighten, and an SVG colour matrix for the adjustments (`model/recipe.util.ts`, tested against
the Rust formulas). HEIC, AVIF and RAW files are listed with their metadata and shown with a placeholder
thumbnail; decoding them is a follow-up.

## Security

- **The webview never sees paths it can use.** Pictures load through `gallery-thumb://` and
  `gallery-media://`, which take a library id, not a path, so nothing rendered can read a file
  outside the library. File commands also take ids.
- **Originals are never written.** Edits are saved as `<name> (edited).<ext>`; renames refuse
  names with separators or reserved characters; deletes go to the OS Trash.
- **Exports can be shared safely.** Re-encoded copies carry no metadata, so camera, date and
  location are left out.
- **Nothing is uploaded.** Places come from an embedded city list; there are no network calls.

## Storage

`other/databases/genslate/gallery/library.sqlite` holds the library folders, every item with its
metadata, favorites, ratings, albums, tags, the Trash list, duplicate hashes and a full-text
index. Removing a folder or forgetting an item only removes rows. Thumbnails are cached in
`other/cache/genslate/gallery/thumbnails/`, keyed by path, size and modification time. Both move with the
portable install.

## Settings

`[gallery]` in `other/config/slatesuite/apps/gallery.config.toml`: `view`, `group-by`, `sort-by`,
`sort-descending`, `thumbnail-size`, `show-videos`, `include-hidden`, `confirm-trash`,
`slideshow-seconds` (1–60), `info-panel`, `suggest-pictures`. The settings dialog writes them
back (comments are kept).

## Known limits

- The native window hasn't been QA'd yet on Windows or macOS.
- HEIC, AVIF and RAW show placeholder thumbnails.
- Put back from the Trash works on Windows and Linux; on macOS it says to restore them from
  the Trash in Finder.
- People, Memories, the assistant, Describe, Smart edits and searching by description are
  previews.
