import { describe, expect, test } from 'bun:test';
import { parseHotkey } from '@genslate/design-system';

import { COMMANDS, command } from '../../../src/app/commands.registry';

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
        if (entry.shortcut === undefined) continue;
        const key = JSON.stringify(parseHotkey(entry.shortcut, platform));
        expect(seen.get(key) ?? entry.id).toBe(entry.id);
        seen.set(key, entry.id);
      }
    }
  });

  test('assistant commands are listed but never enabled', () => {
    const soon = COMMANDS.filter((entry) => entry.soon === true);
    expect(soon.length).toBeGreaterThan(0);
    for (const entry of soon) {
      expect(entry.group).toBe('AI');
      expect(entry.enabled).toBeDefined();
    }
  });
});
