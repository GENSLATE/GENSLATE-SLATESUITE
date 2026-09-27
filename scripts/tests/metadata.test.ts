import { describe, expect, test } from 'bun:test';

import { type MetadataStamp, stampMetadata } from '../lib/metadata';

const STAMP: MetadataStamp = {
  version: '1.2.3',
  build: '20260926.abc1234',
  identifier: 'space.angeletti.genslate.explorer',
  exe: {
    windows: 'genslate-explorer.exe',
    macos: 'GENSLATE Explorer.app',
    linux: 'genslate-explorer',
  },
};

const SOURCE = `# How the launcher shows Explorer.
[app]
name = "Explorer"
# Shown under the name.
description = "Browse your files"

[build]
guid = "0b8f7c7e-1111-4222-8333-944455556666"
version = "0.0.0"

[exe]
windows = "old.exe"
`;

describe('stampMetadata', () => {
  test('keeps the hand-written [app] table and its comments', () => {
    const out = stampMetadata(SOURCE, STAMP);
    expect(out).toContain('# How the launcher shows Explorer.\n[app]\nname = "Explorer"');
    expect(out).toContain('# Shown under the name.\ndescription = "Browse your files"');
  });

  test('replaces [build] and [exe] but keeps the guid', () => {
    const parsed = Bun.TOML.parse(stampMetadata(SOURCE, STAMP)) as {
      build: Record<string, string>;
      exe: Record<string, string>;
    };
    expect(parsed.build).toEqual({
      guid: '0b8f7c7e-1111-4222-8333-944455556666',
      version: '1.2.3',
      build: '20260926.abc1234',
      identifier: 'space.angeletti.genslate.explorer',
    });
    expect(parsed.exe['windows']).toBe('genslate-explorer.exe');
    expect(parsed.exe['macos']).toBe('GENSLATE Explorer.app');
  });

  test('adds the tables when they are missing', () => {
    const parsed = Bun.TOML.parse(stampMetadata('[app]\nname = "X"\n', STAMP)) as {
      build: Record<string, string>;
    };
    expect(parsed.build['version']).toBe('1.2.3');
    expect(parsed.build['guid']).toBeUndefined();
  });

  test('handles CRLF files', () => {
    const out = stampMetadata(SOURCE.replaceAll('\n', '\r\n'), STAMP);
    expect(Bun.TOML.parse(out)).toHaveProperty('app.name', 'Explorer');
    expect(out.match(/\[build\]/g)).toHaveLength(1);
  });
});
