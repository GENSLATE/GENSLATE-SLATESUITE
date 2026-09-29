import { describe, expect, test } from 'bun:test';
import { parseHotkey } from '@genslate/design-system';

import { COMMANDS, command, shortcutFor } from '../../../src/app/commands.registry';

describe('command registry', () => {
  test('ids are unique and resolvable', () => {
    const ids = COMMANDS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(command(id).id).toBe(id);
  });

  test('no two commands share a shortcut on any platform', () => {
    for (const platform of ['macos', 'windows', 'linux'] as const) {
      const seen = new Map<string, string>();
      for (const entry of COMMANDS) {
        const shortcut = shortcutFor(entry, platform);
        if (shortcut === undefined) continue;
        const key = JSON.stringify(parseHotkey(shortcut, platform));
        expect(`${platform} ${shortcut}: ${seen.get(key) ?? entry.id}`).toBe(
          `${platform} ${shortcut}: ${entry.id}`,
        );
        seen.set(key, entry.id);
      }
    }
  });

  test('on Windows and Linux, plain Ctrl+letter stays with the shell', () => {
    for (const entry of COMMANDS) {
      const shortcut = entry.shortcut;
      if (shortcut === undefined) continue;
      // Ctrl+C, Ctrl+W, Ctrl+R… belong to the shell; the app uses Ctrl+Shift like Windows Terminal.
      expect(`${entry.id}: ${/^ctrl\+[a-z]$/.test(shortcut)}`).toBe(`${entry.id}: false`);
    }
  });

  test('assistant commands are grouped under AI and listed as previews', () => {
    const soon = COMMANDS.filter((entry) => entry.soon === true);
    expect(soon.length).toBeGreaterThan(0);
    for (const entry of soon) expect(entry.group).toBe('AI');
  });
});
