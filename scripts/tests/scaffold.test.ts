import { describe, expect, test } from 'bun:test';

import {
  addWorkspaceDependency,
  configStub,
  parseMetadata,
  placeholderIcon,
  tauriCategory,
} from '../lib/scaffold';

const CARGO = `[workspace]
members = ["crates/core/*"]

[workspace.dependencies]
# ── Internal crates ──
genslate-paths = { path = "crates/paths" }
genslate-core-example = { path = "crates/core/example" }
genslate-core-launcher = { path = "crates/core/launcher" }

# ── Tauri ──
tauri = "2"

[workspace.lints.rust]
unsafe_code = "deny"
`;

describe('addWorkspaceDependency', () => {
  test('inserts after the last genslate-core entry', () => {
    const out = addWorkspaceDependency(CARGO, 'genslate-core-notes', 'crates/core/notes');
    expect(out).toContain(
      'genslate-core-launcher = { path = "crates/core/launcher" }\ngenslate-core-notes = { path = "crates/core/notes" }\n\n# ── Tauri ──',
    );
    const parsed = Bun.TOML.parse(out) as {
      workspace: { dependencies: Record<string, { path: string }> };
    };
    expect(parsed.workspace.dependencies['genslate-core-notes']?.path).toBe('crates/core/notes');
  });

  test('keeps the core crates in alphabetical order', () => {
    const out = addWorkspaceDependency(CARGO, 'genslate-core-editor', 'crates/core/editor');
    expect(out).toContain(
      'genslate-core-example = { path = "crates/core/example" }\ngenslate-core-launcher',
    );
    expect(out).toContain(
      'genslate-paths = { path = "crates/paths" }\ngenslate-core-editor = { path = "crates/core/editor" }\ngenslate-core-example',
    );
  });

  test('is idempotent', () => {
    const once = addWorkspaceDependency(CARGO, 'genslate-core-notes', 'crates/core/notes');
    expect(addWorkspaceDependency(once, 'genslate-core-notes', 'crates/core/notes')).toBe(once);
    expect(addWorkspaceDependency(CARGO, 'genslate-core-example', 'x')).toBe(CARGO);
  });

  test('appends to the table when there is no core crate yet', () => {
    const cargo = '[workspace.dependencies]\nserde = "1"\n\n[profile.release]\nlto = true\n';
    expect(addWorkspaceDependency(cargo, 'genslate-core-notes', 'crates/core/notes')).toBe(
      '[workspace.dependencies]\nserde = "1"\ngenslate-core-notes = { path = "crates/core/notes" }\n\n[profile.release]\nlto = true\n',
    );
  });

  test('fails without a [workspace.dependencies] table', () => {
    expect(() => addWorkspaceDependency('[workspace]\n', 'genslate-core-notes', 'x')).toThrow();
  });
});

describe('launcher metadata defaults', () => {
  test('reads the [app] table', () => {
    expect(
      parseMetadata(
        '[app]\nname = "AI Studio"\ndescription = "Chat with models"\ncategory = "AI"\ncolor = "nord15"\n',
      ),
    ).toEqual({ name: 'AI Studio', description: 'Chat with models', category: 'AI' });
  });

  test('missing or broken files give no defaults', () => {
    expect(parseMetadata(undefined)).toEqual({});
    expect(parseMetadata('[app\nname = ')).toEqual({});
    expect(parseMetadata('[app]\nname = 3\n')).toEqual({});
  });

  test('maps launcher categories to Tauri bundle categories', () => {
    expect(tauriCategory('Development')).toBe('DeveloperTool');
    expect(tauriCategory('Office')).toBe('Productivity');
    expect(tauriCategory('Unknown')).toBe('Utility');
    expect(tauriCategory(undefined)).toBe('Utility');
  });
});

describe('stubs', () => {
  test('the config stub declares the shared sections', () => {
    const parsed = Bun.TOML.parse(configStub('notes', 'GENSLATE Notes')) as Record<
      string,
      Record<string, unknown>
    >;
    expect(parsed['appearance']?.['theme']).toBe('system');
    expect(parsed['window']?.['remember-state']).toBe(true);
    expect(parsed['logging']?.['level']).toBe('info');
  });

  test('the placeholder icon is a titled 1024 px SVG', () => {
    const svg = placeholderIcon('GENSLATE Notes');
    expect(svg).toStartWith('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"');
    expect(svg).toContain('<title>GENSLATE Notes</title>');
  });
});
