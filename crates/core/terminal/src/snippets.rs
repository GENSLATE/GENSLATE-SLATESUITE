//! Snippets: saved commands the user pastes (and optionally runs) from the palette, kept in
//! `snippets.toml` next to `config.toml`:
//!
//! ```toml
//! [[snippet]]
//! id = "git-status"          # stable; written by the app (slug of the name)
//! name = "Git status"
//! command = "git status -sb"
//! description = "Branch and changed files, short"
//! run = true                 # press Enter after pasting
//! ```
//!
//! The app rewrites the whole file when a snippet is saved or deleted (comments inside the
//! list are not kept; the header is).

use std::fs;
use std::path::Path;

use genslate_app_common::config;
use serde::{Deserialize, Serialize};

use crate::TerminalError;
use crate::profiles::slug;

/// File name inside the app's config folder.
pub const FILE_NAME: &str = "snippets.toml";

const HEADER: &str = "# GENSLATE Terminal — snippets. Edit them in the app (Command palette → Snippets) or here.\n\
# Each [[snippet]]: name, command, description (optional), run = true to press Enter after\n\
# pasting. `id` is written by the app; keep it stable.\n\n";

const MAX_NAME: usize = 200;
const MAX_COMMAND: usize = 16 * 1024;
const MAX_DESCRIPTION: usize = 2_000;

/// A saved command.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub command: String,
    pub description: String,
    /// Press Enter after pasting.
    pub run: bool,
}

/// A snippet from the editor: `id: None` creates one.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetInput {
    pub id: Option<String>,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub run: bool,
}

/// The file as written on disk (ids and descriptions may be missing in hand-written files).
#[derive(Debug, Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
struct SnippetsFile {
    snippet: Vec<StoredSnippet>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredSnippet {
    #[serde(default)]
    id: Option<String>,
    name: String,
    command: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    run: bool,
}

/// The snippets in `path` (none when the file does not exist). Snippets without an id get
/// one from their name.
pub fn load(path: &Path) -> Result<Vec<Snippet>, TerminalError> {
    let file: SnippetsFile =
        config::load(path).map_err(|error| TerminalError::Snippets(error.to_string()))?;
    let mut snippets: Vec<Snippet> = Vec::with_capacity(file.snippet.len());
    for stored in file.snippet {
        let id = match stored.id.map(|id| id.trim().to_owned()) {
            Some(id) if !id.is_empty() && !snippets.iter().any(|known| known.id == id) => id,
            _ => unique_id(&stored.name, &snippets),
        };
        snippets.push(Snippet {
            id,
            name: stored.name,
            command: stored.command,
            description: stored.description,
            run: stored.run,
        });
    }
    Ok(snippets)
}

/// Adds (`id: None`) or replaces a snippet and returns them all.
pub fn save(path: &Path, input: SnippetInput) -> Result<Vec<Snippet>, TerminalError> {
    let name = input.name.trim().to_owned();
    let description = input.description.trim().to_owned();
    let command = input.command.trim_end_matches(['\r', '\n']).to_owned();
    validate(&name, &command, &description)?;
    let mut snippets = load(path)?;
    if let Some(id) = input.id {
        let existing = snippets
            .iter_mut()
            .find(|snippet| snippet.id == id)
            .ok_or_else(|| TerminalError::InvalidArgument(format!("no snippet with id “{id}”")))?;
        existing.name = name;
        existing.command = command;
        existing.description = description;
        existing.run = input.run;
    } else {
        let id = unique_id(&name, &snippets);
        snippets.push(Snippet {
            id,
            name,
            command,
            description,
            run: input.run,
        });
    }
    write(path, &snippets)?;
    Ok(snippets)
}

/// Deletes a snippet (nothing happens for an unknown id) and returns the rest.
pub fn delete(path: &Path, id: &str) -> Result<Vec<Snippet>, TerminalError> {
    let mut snippets = load(path)?;
    let before = snippets.len();
    snippets.retain(|snippet| snippet.id != id);
    if snippets.len() != before {
        write(path, &snippets)?;
    }
    Ok(snippets)
}

fn validate(name: &str, command: &str, description: &str) -> Result<(), TerminalError> {
    let problem = if name.is_empty() {
        "a snippet needs a name"
    } else if command.trim().is_empty() {
        "a snippet needs a command"
    } else if name.len() > MAX_NAME {
        "the name is too long"
    } else if command.len() > MAX_COMMAND {
        "the command is too long"
    } else if description.len() > MAX_DESCRIPTION {
        "the description is too long"
    } else {
        return Ok(());
    };
    Err(TerminalError::InvalidArgument(problem.to_owned()))
}

/// The slug of `name`, with `-2`, `-3`… when taken.
fn unique_id(name: &str, snippets: &[Snippet]) -> String {
    let base = slug(name);
    let mut id = base.clone();
    let mut counter = 2;
    while snippets.iter().any(|snippet| snippet.id == id) {
        id = format!("{base}-{counter}");
        counter += 1;
    }
    id
}

fn write(path: &Path, snippets: &[Snippet]) -> Result<(), TerminalError> {
    let mut list = toml_edit::ArrayOfTables::new();
    for snippet in snippets {
        let mut table = toml_edit::Table::new();
        table["id"] = toml_edit::value(snippet.id.as_str());
        table["name"] = toml_edit::value(snippet.name.as_str());
        table["command"] = toml_edit::value(snippet.command.as_str());
        if !snippet.description.is_empty() {
            table["description"] = toml_edit::value(snippet.description.as_str());
        }
        table["run"] = toml_edit::value(snippet.run);
        list.push(table);
    }
    let mut document = toml_edit::DocumentMut::new();
    document["snippet"] = toml_edit::Item::ArrayOfTables(list);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(TerminalError::io("could not create", parent))?;
    }
    fs::write(path, format!("{HEADER}{document}"))
        .map_err(TerminalError::io("could not write", path))
}

#[cfg(test)]
mod tests {
    use genslate_testing::TempTree;

    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn input(id: Option<&str>, name: &str, command: &str) -> SnippetInput {
        SnippetInput {
            id: id.map(str::to_owned),
            name: name.to_owned(),
            command: command.to_owned(),
            description: String::new(),
            run: false,
        }
    }

    #[test]
    fn missing_file_has_no_snippets() -> TestResult {
        let tree = TempTree::new()?;
        assert!(load(&tree.join(FILE_NAME))?.is_empty());
        Ok(())
    }

    #[test]
    fn round_trips_through_the_file() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join("config/").join(FILE_NAME);
        let saved = save(
            &path,
            SnippetInput {
                description: "Short status".to_owned(),
                run: true,
                ..input(None, "Git status", "git status -sb\n")
            },
        )?;
        assert_eq!(saved.len(), 1);
        assert_eq!(saved[0].id, "git-status");
        assert_eq!(
            saved[0].command, "git status -sb",
            "trailing newline dropped"
        );
        let quotes = save(
            &path,
            input(None, "Quotes \"and\" 'more'", "echo \"a\\b\" 'c'"),
        )?;
        assert_eq!(load(&path)?, quotes);
        let text = tree.read(Path::new("config").join(FILE_NAME))?;
        assert!(text.starts_with("# GENSLATE Terminal"), "{text}");
        assert!(text.contains("[[snippet]]"), "{text}");
        Ok(())
    }

    #[test]
    fn edits_keep_the_id_and_new_names_get_unique_ids() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join(FILE_NAME);
        save(&path, input(None, "Deploy", "./deploy.sh"))?;
        let two = save(&path, input(None, "Deploy", "./deploy.sh --prod"))?;
        assert_eq!(two[1].id, "deploy-2");
        let edited = save(
            &path,
            input(Some("deploy"), "Deploy staging", "./deploy.sh staging"),
        )?;
        assert_eq!(edited[0].id, "deploy");
        assert_eq!(edited[0].name, "Deploy staging");
        assert!(save(&path, input(Some("nope"), "X", "x")).is_err());
        Ok(())
    }

    #[test]
    fn deletes_by_id() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join(FILE_NAME);
        save(&path, input(None, "One", "1"))?;
        save(&path, input(None, "Two", "2"))?;
        let left = delete(&path, "one")?;
        assert_eq!(left.len(), 1);
        assert_eq!(left[0].id, "two");
        assert_eq!(delete(&path, "unknown")?.len(), 1);
        Ok(())
    }

    #[test]
    fn rejects_invalid_snippets() -> TestResult {
        let tree = TempTree::new()?;
        let path = tree.join(FILE_NAME);
        assert!(save(&path, input(None, "  ", "ls")).is_err());
        assert!(save(&path, input(None, "Name", " \n")).is_err());
        assert!(save(&path, input(None, &"n".repeat(500), "ls")).is_err());
        assert!(!path.exists());
        Ok(())
    }

    #[test]
    fn hand_written_files_get_ids() -> TestResult {
        let tree = TempTree::new()?.file(
            FILE_NAME,
            "[[snippet]]\nname = \"Ports\"\ncommand = \"ss -ltn\"\n\n[[snippet]]\nid = \"ports\"\nname = \"Dup\"\ncommand = \"x\"\n",
        )?;
        let snippets = load(&tree.join(FILE_NAME))?;
        assert_eq!(snippets[0].id, "ports");
        assert_eq!(snippets[1].id, "dup", "a duplicate id is replaced");
        assert!(!snippets[0].run);
        let bad = tree.write("bad.toml", "[[snippet]]\nname = \"x\"\n")?;
        assert_eq!(load(&bad).err().map(|error| error.kind()), Some("snippets"));
        Ok(())
    }

    #[test]
    fn repo_snippets_parse() -> TestResult {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../other/config/genslate/terminal")
            .join(FILE_NAME);
        let snippets = load(&path)?;
        assert!(snippets.len() >= 4);
        assert!(snippets.iter().all(|snippet| !snippet.id.is_empty()));
        Ok(())
    }
}
