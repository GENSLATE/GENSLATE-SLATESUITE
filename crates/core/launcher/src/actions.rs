//! The command registry: every launcher action, described as data.
//!
//! The slash bar lists and runs these today. The same descriptions — id, summary, typed
//! parameters and an [`Effect`] — are what an AI agent or MCP server will be given later, so
//! it can drive the launcher through exactly the actions a person can (gated by effect).

use serde::Serialize;
use serde_json::{Map, Value};

use crate::LauncherError;

/// What running an action does — used to gate automated callers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Effect {
    /// Changes only what the launcher shows.
    Ui,
    /// Shows, hides or pins the window.
    Window,
    /// Reads state (rescans).
    Read,
    /// Starts a program.
    Launch,
    /// Opens a folder or file in another app.
    Open,
    /// Writes the user's config files.
    WritesConfig,
    /// Talks to an AI model (not available yet).
    Ai,
}

/// Type of a parameter.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum ParamKind {
    /// An app, by name or id (the UI resolves names).
    App,
    /// One of a fixed set of values.
    Choice { values: &'static [&'static str] },
    /// Free text.
    Text,
}

/// One parameter.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParamSpec {
    pub name: &'static str,
    pub description: &'static str,
    #[serde(flatten)]
    pub kind: ParamKind,
    pub required: bool,
}

/// One action.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionSpec {
    /// Stable id, also the slash command (`/open`).
    pub id: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub params: &'static [ParamSpec],
    pub effect: Effect,
}

const APP: ParamSpec = ParamSpec {
    name: "app",
    description: "App name or id",
    kind: ParamKind::App,
    required: true,
};

/// Folders of the portable storage (`storage/users/<profile>/…`) plus the storage root.
pub const FOLDERS: &[&str] = &[
    "desktop",
    "documents",
    "downloads",
    "music",
    "pictures",
    "videos",
    "storage",
];

/// Every action, in the order the slash menu lists them.
pub const ACTIONS: &[ActionSpec] = &[
    ActionSpec {
        id: "open",
        title: "Open app",
        description: "Launch an app",
        params: &[APP],
        effect: Effect::Launch,
    },
    ActionSpec {
        id: "folder",
        title: "Open folder",
        description: "Open one of your portable folders",
        params: &[ParamSpec {
            name: "name",
            description: "Folder",
            kind: ParamKind::Choice { values: FOLDERS },
            required: true,
        }],
        effect: Effect::Open,
    },
    ActionSpec {
        id: "tab",
        title: "Switch tab",
        description: "Show GENSLATE, PortableApps.com or portapps.io apps",
        params: &[ParamSpec {
            name: "source",
            description: "Tab",
            kind: ParamKind::Choice {
                values: &["genslate", "portableapps", "portapps"],
            },
            required: true,
        }],
        effect: Effect::Ui,
    },
    ActionSpec {
        id: "fav",
        title: "Toggle favorite",
        description: "Pin an app to Favorites (or unpin it)",
        params: &[APP],
        effect: Effect::WritesConfig,
    },
    ActionSpec {
        id: "rescan",
        title: "Rescan apps",
        description: "Look for new or removed apps",
        params: &[],
        effect: Effect::Read,
    },
    ActionSpec {
        id: "theme",
        title: "Change theme",
        description: "Polar Night (dark), Snow Storm (light) or follow the system",
        params: &[ParamSpec {
            name: "mode",
            description: "Theme",
            kind: ParamKind::Choice {
                values: &["system", "dark", "light"],
            },
            required: true,
        }],
        effect: Effect::WritesConfig,
    },
    ActionSpec {
        id: "size",
        title: "Change size",
        description: "Small, medium or large window",
        params: &[ParamSpec {
            name: "preset",
            description: "Size",
            kind: ParamKind::Choice {
                values: &["s", "m", "l"],
            },
            required: true,
        }],
        effect: Effect::WritesConfig,
    },
    ActionSpec {
        id: "pin",
        title: "Pin / unpin",
        description: "Keep the launcher on top and open",
        params: &[],
        effect: Effect::Window,
    },
    ActionSpec {
        id: "tools",
        title: "Tools",
        description: "Open or close the tools view",
        params: &[],
        effect: Effect::Ui,
    },
    ActionSpec {
        id: "config",
        title: "Edit settings",
        description: "Open launcher.config.toml",
        params: &[],
        effect: Effect::Open,
    },
    ActionSpec {
        id: "keys",
        title: "Edit shortcuts",
        description: "Open launcher.keybindings.toml",
        params: &[],
        effect: Effect::Open,
    },
    ActionSpec {
        id: "logs",
        title: "Open logs",
        description: "Open the launcher's log folder",
        params: &[],
        effect: Effect::Open,
    },
    ActionSpec {
        id: "ask",
        title: "Ask AI",
        description: "Ask the GENSLATE assistant (coming soon)",
        params: &[ParamSpec {
            name: "prompt",
            description: "Your question",
            kind: ParamKind::Text,
            required: false,
        }],
        effect: Effect::Ai,
    },
    ActionSpec {
        id: "help",
        title: "Help",
        description: "Shortcuts and commands",
        params: &[],
        effect: Effect::Ui,
    },
    ActionSpec {
        id: "hide",
        title: "Hide",
        description: "Hide the launcher",
        params: &[],
        effect: Effect::Window,
    },
    ActionSpec {
        id: "quit",
        title: "Quit",
        description: "Close the launcher (apps keep running)",
        params: &[],
        effect: Effect::Window,
    },
];

/// Looks an action up by id.
pub fn find(id: &str) -> Result<&'static ActionSpec, LauncherError> {
    ACTIONS
        .iter()
        .find(|spec| spec.id == id)
        .ok_or_else(|| LauncherError::UnknownAction(id.to_owned()))
}

/// Checks `params` against the action's spec: required present, choices valid, strings only,
/// no unknown names.
pub fn validate(spec: &ActionSpec, params: &Map<String, Value>) -> Result<(), LauncherError> {
    let invalid = |message: String| LauncherError::InvalidParams {
        action: spec.id.to_owned(),
        message,
    };
    for name in params.keys() {
        if !spec.params.iter().any(|param| param.name == name) {
            return Err(invalid(format!("unknown parameter {name:?}")));
        }
    }
    for param in spec.params {
        match params.get(param.name) {
            None | Some(Value::Null) if param.required => {
                return Err(invalid(format!(
                    "{} is required",
                    param.description.to_lowercase()
                )));
            }
            None | Some(Value::Null) => {}
            Some(Value::String(text)) => {
                if let ParamKind::Choice { values } = param.kind
                    && !values.contains(&text.as_str())
                {
                    return Err(invalid(format!("use one of: {}", values.join(", "))));
                }
                if param.required && text.trim().is_empty() {
                    return Err(invalid(format!(
                        "{} is required",
                        param.description.to_lowercase()
                    )));
                }
            }
            Some(_) => return Err(invalid(format!("{} must be text", param.name))),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn params(value: Value) -> Map<String, Value> {
        value.as_object().cloned().unwrap_or_default()
    }

    #[test]
    fn ids_are_unique_slash_words() {
        let mut ids: Vec<&str> = ACTIONS.iter().map(|spec| spec.id).collect();
        assert!(
            ids.iter()
                .all(|id| id.bytes().all(|b| b.is_ascii_lowercase()))
        );
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), ACTIONS.len());
    }

    #[test]
    fn validates_required_and_choice_params() -> Result<(), LauncherError> {
        let theme = find("theme")?;
        assert!(validate(theme, &params(json!({ "mode": "dark" }))).is_ok());
        assert!(validate(theme, &params(json!({ "mode": "purple" }))).is_err());
        assert!(validate(theme, &params(json!({}))).is_err());
        assert!(validate(theme, &params(json!({ "mode": "dark", "x": 1 }))).is_err());
        assert!(
            validate(find("ask")?, &params(json!({}))).is_ok(),
            "optional"
        );
        assert!(validate(find("open")?, &params(json!({ "app": 3 }))).is_err());
        assert!(find("nope").is_err());
        Ok(())
    }

    #[test]
    fn serialises_for_the_ui_and_agents() -> Result<(), serde_json::Error> {
        let json = serde_json::to_value(ACTIONS)?;
        assert_eq!(json[0]["id"], "open");
        assert_eq!(json[0]["effect"], "launch");
        assert_eq!(json[0]["params"][0]["type"], "app");
        let folder = &json[1]["params"][0];
        assert_eq!(folder["type"], "choice");
        assert_eq!(folder["values"][0], "desktop");
        Ok(())
    }
}
