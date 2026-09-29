//! Fuzzy ranking (fzf-style, via `nucleo-matcher`), shared by history search and future
//! pickers.
//!
//! Queries use fzf's syntax: space-separated words must all match; `^word` anchors to the
//! start, `word$` to the end, `'word` matches exactly and `!word` excludes. Lower-case words
//! ignore case ("smart case").

use std::cmp::Reverse;

use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};

/// The items matching `query`, best first; equal scores keep the order of `items` (so pass
/// them newest first to break ties by recency). An empty query matches everything with
/// score 0.
pub fn rank<'a, T>(query: &str, items: &'a [T], key: impl Fn(&T) -> &str) -> Vec<(u32, &'a T)> {
    let pattern = Pattern::parse(query, CaseMatching::Smart, Normalization::Smart);
    let mut matcher = Matcher::new(Config::DEFAULT);
    let mut buffer = Vec::new();
    let mut ranked: Vec<(u32, &T)> = items
        .iter()
        .filter_map(|item| {
            let haystack = Utf32Str::new(key(item), &mut buffer);
            pattern
                .score(haystack, &mut matcher)
                .map(|score| (score, item))
        })
        .collect();
    // `sort_by_key` is stable: ties keep the input order.
    ranked.sort_by_key(|(score, _)| Reverse(*score));
    ranked
}

#[cfg(test)]
mod tests {
    use super::*;

    fn names<'a>(ranked: &[(u32, &&'a str)]) -> Vec<&'a str> {
        ranked.iter().map(|(_, item)| **item).collect()
    }

    #[test]
    fn best_matches_first() {
        let items = ["cargo build", "git status", "git stash", "gst"];
        let ranked = rank("git st", &items, |item| item);
        assert_eq!(names(&ranked)[..2], ["git status", "git stash"]);
        assert!(!names(&ranked).contains(&"cargo build"));
    }

    #[test]
    fn ties_keep_the_input_order() {
        let items = ["ls -a", "ls -b", "ls -c"];
        assert_eq!(names(&rank("ls", &items, |item| item)), items);
    }

    #[test]
    fn empty_query_matches_everything() {
        let items = ["b", "a"];
        let ranked = rank("  ", &items, |item| item);
        assert_eq!(names(&ranked), ["b", "a"]);
        assert!(ranked.iter().all(|(score, _)| *score == 0));
    }

    #[test]
    fn supports_fzf_syntax_and_smart_case() {
        let items = ["npm install", "bun install", "Bun run"];
        assert_eq!(
            names(&rank("^bun", &items, |item| item)),
            ["bun install", "Bun run"]
        );
        assert_eq!(names(&rank("^npm", &items, |item| item)), ["npm install"]);
        assert_eq!(
            names(&rank("bun !install", &items, |item| item)),
            ["Bun run"]
        );
        assert_eq!(names(&rank("Bun", &items, |item| item)), ["Bun run"]);
        assert_eq!(rank("bun", &items, |item| item).len(), 2);
    }
}
