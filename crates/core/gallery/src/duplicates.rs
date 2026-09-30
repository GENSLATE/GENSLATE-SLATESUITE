//! Finds copies: **exact** duplicates share their bytes (same size, same BLAKE3 hash), and
//! **similar** photos look alike (burst shots, resized or re-saved copies) by perceptual hash
//! (`image_hasher`, gradient hash of the cached thumbnail). Hashes are stored in the library,
//! so the next search only hashes new or changed files.

use std::collections::{BTreeMap, HashMap};
use std::fs::File;
use std::io;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

use image_hasher::{HashAlg, HasherConfig, ImageHash};
use rayon::prelude::*;
use serde::Serialize;

use crate::GalleryError;
use crate::kind::{Format, MediaKind};
use crate::library::{HashCandidate, Library};
use crate::thumbnail::{THUMB_EDGE, ThumbnailCache, ThumbnailKey};

/// Photos whose perceptual hashes differ in at most this many bits count as similar.
pub const SIMILAR_BITS: u32 = 6;

/// How alike the items of a group are.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Likeness {
    Exact,
    Similar,
}

/// Items that are copies of each other, largest file first.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub likeness: Likeness,
    pub ids: Vec<i64>,
    /// Bytes freed by keeping only the first item.
    pub reclaimable: u64,
}

/// How far a search has come.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateProgress {
    pub hashed: usize,
    pub to_hash: usize,
}

/// Hashes what is missing, then groups the library's copies.
pub fn find(
    library: &Library,
    thumbnails: &ThumbnailCache,
    cancel: &AtomicBool,
    mut progress: impl FnMut(DuplicateProgress),
) -> Result<Option<Vec<DuplicateGroup>>, GalleryError> {
    let candidates = library.hash_candidates()?;

    // Only files sharing their size with another can be exact copies.
    let mut by_size: HashMap<u64, usize> = HashMap::new();
    for candidate in &candidates {
        *by_size.entry(candidate.size).or_default() += 1;
    }
    let needs_content = |candidate: &HashCandidate| {
        candidate.content_hash.is_none() && by_size.get(&candidate.size).copied().unwrap_or(0) > 1
    };
    let needs_perceptual = |candidate: &HashCandidate| {
        candidate.phash.is_none()
            && candidate.kind == MediaKind::Image
            && Format::of(Path::new(&candidate.path)).is_some_and(Format::decodable)
    };
    let work: Vec<&HashCandidate> = candidates
        .iter()
        .filter(|candidate| needs_content(candidate) || needs_perceptual(candidate))
        .collect();

    let mut report = DuplicateProgress {
        hashed: 0,
        to_hash: work.len(),
    };
    progress(report);
    let mut computed: HashMap<i64, (Option<String>, Option<String>)> = HashMap::new();
    for chunk in work.chunks(32) {
        if cancel.load(Ordering::Relaxed) {
            return Ok(None);
        }
        let hashes: Vec<(i64, Option<String>, Option<String>)> = chunk
            .par_iter()
            .map(|candidate| {
                let content = needs_content(candidate)
                    .then(|| content_hash(Path::new(&candidate.path)).ok())
                    .flatten();
                let perceptual = needs_perceptual(candidate)
                    .then(|| perceptual_hash(thumbnails, candidate))
                    .flatten();
                (candidate.id, content, perceptual)
            })
            .collect();
        library.set_hashes(&hashes)?;
        for (id, content, perceptual) in hashes {
            computed.insert(id, (content, perceptual));
        }
        report.hashed += chunk.len();
        progress(report);
    }

    let hashed: Vec<Hashed> = candidates
        .into_iter()
        .map(|candidate| {
            let (content, perceptual) = computed.remove(&candidate.id).unwrap_or_default();
            Hashed {
                content: candidate.content_hash.or(content),
                perceptual: candidate
                    .phash
                    .or(perceptual)
                    .and_then(|text| ImageHash::<Box<[u8]>>::from_base64(&text).ok()),
                id: candidate.id,
                size: candidate.size,
            }
        })
        .collect();
    Ok(Some(group(&hashed)))
}

/// One item with its hashes.
#[derive(Debug, Clone)]
struct Hashed {
    id: i64,
    size: u64,
    content: Option<String>,
    perceptual: Option<ImageHash<Box<[u8]>>>,
}

/// Exact groups first (by bytes freed), then similar groups of items that aren't exact
/// copies of each other.
fn group(items: &[Hashed]) -> Vec<DuplicateGroup> {
    let mut exact: BTreeMap<(&str, u64), Vec<&Hashed>> = BTreeMap::new();
    for item in items {
        if let Some(content) = &item.content {
            exact
                .entry((content.as_str(), item.size))
                .or_default()
                .push(item);
        }
    }
    let mut groups: Vec<DuplicateGroup> = exact
        .into_values()
        .filter(|members| members.len() > 1)
        .map(|members| make_group(Likeness::Exact, &members))
        .collect();

    // Union-find over perceptual neighbours, one representative per exact group.
    let mut in_exact: HashMap<i64, i64> = HashMap::new();
    for group in &groups {
        for id in &group.ids {
            in_exact.insert(*id, group.ids[0]);
        }
    }
    let similar: Vec<&Hashed> = items
        .iter()
        .filter(|item| item.perceptual.is_some())
        .filter(|item| in_exact.get(&item.id).is_none_or(|first| *first == item.id))
        .collect();
    let mut parent: Vec<usize> = (0..similar.len()).collect();
    for a in 0..similar.len() {
        for b in (a + 1)..similar.len() {
            if let (Some(left), Some(right)) = (&similar[a].perceptual, &similar[b].perceptual)
                && left.dist(right) <= SIMILAR_BITS
            {
                let (root_a, root_b) = (find_root(&mut parent, a), find_root(&mut parent, b));
                if root_a != root_b {
                    parent[root_b] = root_a;
                }
            }
        }
    }
    let mut clusters: BTreeMap<usize, Vec<&Hashed>> = BTreeMap::new();
    for (index, item) in similar.iter().enumerate() {
        let root = find_root(&mut parent, index);
        clusters.entry(root).or_default().push(*item);
    }
    groups.extend(
        clusters
            .into_values()
            .filter(|members| members.len() > 1)
            .map(|members| make_group(Likeness::Similar, &members)),
    );
    groups.sort_by(|a, b| {
        (a.likeness != Likeness::Exact)
            .cmp(&(b.likeness != Likeness::Exact))
            .then(b.reclaimable.cmp(&a.reclaimable))
    });
    groups
}

fn make_group(likeness: Likeness, members: &[&Hashed]) -> DuplicateGroup {
    let mut members = members.to_vec();
    members.sort_by(|a, b| b.size.cmp(&a.size).then(a.id.cmp(&b.id)));
    DuplicateGroup {
        likeness,
        ids: members.iter().map(|member| member.id).collect(),
        reclaimable: members.iter().skip(1).map(|member| member.size).sum(),
    }
}

fn find_root(parent: &mut [usize], mut index: usize) -> usize {
    while parent[index] != index {
        parent[index] = parent[parent[index]];
        index = parent[index];
    }
    index
}

/// BLAKE3 of the whole file, as hex.
pub fn content_hash(path: &Path) -> Result<String, GalleryError> {
    let mut file = File::open(path).map_err(GalleryError::io("could not open", path))?;
    let mut hasher = blake3::Hasher::new();
    io::copy(&mut file, &mut hasher).map_err(GalleryError::io("could not read", path))?;
    Ok(hasher.finalize().to_hex().to_string())
}

/// The perceptual hash of an image's cached thumbnail, as base64.
fn perceptual_hash(thumbnails: &ThumbnailCache, candidate: &HashCandidate) -> Option<String> {
    let path = Path::new(&candidate.path);
    let format = Format::of(path)?;
    let key = ThumbnailKey {
        path,
        size: candidate.size,
        modified_ms: candidate.modified_ms,
        edge: THUMB_EDGE,
    };
    let encoded = thumbnails.get_or_render(&key, format).ok()?;
    let image = image::load_from_memory(&encoded.bytes).ok()?;
    let hasher = HasherConfig::new()
        .hash_alg(HashAlg::Gradient)
        .hash_size(8, 8)
        .to_hasher();
    Some(hasher.hash_image(&image).to_base64())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::{jpeg, stripes};
    use crate::scan::{ScanOptions, sync_folder};
    use genslate_testing::TempTree;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    #[test]
    fn finds_exact_and_similar_copies() -> TestResult {
        let original = jpeg(400, 300, 30)?;
        let tree = TempTree::new()?
            .file("p/a.jpg", &original)?
            .file("p/copy of a.jpg", &original)?
            .file("p/a small.jpg", jpeg(200, 150, 30)?)?
            .file("p/other.jpg", stripes(300, 400)?)?;
        let library = Library::open_in_memory()?;
        sync_folder(
            &library,
            &tree.join("p"),
            ScanOptions::default(),
            &AtomicBool::new(false),
            |_| {},
        )?;
        let cache = ThumbnailCache::new(tree.join("cache"));
        let mut reports = Vec::new();
        let groups = find(&library, &cache, &AtomicBool::new(false), |report| {
            reports.push(report);
        })?
        .ok_or("cancelled")?;
        assert_eq!(reports.last().map(|report| report.hashed), Some(4));

        let name = |id: i64| library.item(id).map(|item| item.name);
        let exact = &groups[0];
        assert_eq!(exact.likeness, Likeness::Exact);
        assert_eq!(exact.ids.len(), 2);
        assert_eq!(exact.reclaimable, original.len() as u64);

        let similar = groups
            .iter()
            .find(|group| group.likeness == Likeness::Similar)
            .ok_or("similar group")?;
        let names: Vec<String> = similar
            .ids
            .iter()
            .map(|id| name(*id))
            .collect::<Result<_, _>>()?;
        assert!(names.contains(&"a small.jpg".to_owned()), "{names:?}");
        assert!(!names.contains(&"other.jpg".to_owned()), "{names:?}");
        assert_eq!(names.len(), 2, "one of the exact copies stands for both");

        // Hashes are stored: a second search has nothing to hash.
        let mut again = Vec::new();
        find(&library, &cache, &AtomicBool::new(false), |report| {
            again.push(report);
        })?;
        assert_eq!(again[0].to_hash, 0);
        Ok(())
    }

    #[test]
    fn cancelled_searches_return_nothing() -> TestResult {
        let tree = TempTree::new()?
            .file("p/a.jpg", jpeg(10, 10, 1)?)?
            .file("p/b.jpg", jpeg(10, 10, 1)?)?;
        let library = Library::open_in_memory()?;
        sync_folder(
            &library,
            &tree.join("p"),
            ScanOptions::default(),
            &AtomicBool::new(false),
            |_| {},
        )?;
        let cache = ThumbnailCache::new(tree.join("cache"));
        assert_eq!(
            find(&library, &cache, &AtomicBool::new(true), |_| {})?,
            None
        );
        Ok(())
    }
}
