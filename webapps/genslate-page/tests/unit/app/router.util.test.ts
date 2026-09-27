import { describe, expect, test } from 'bun:test';

import { normalizePath, stripBase, withBase } from '../../../src/app/router/router.util';

describe('normalizePath', () => {
  test('adds leading and trailing slashes and collapses repeats', () => {
    expect(normalizePath('apps/terminal')).toBe('/apps/terminal/');
    expect(normalizePath('//docs///faq')).toBe('/docs/faq/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/')).toBe('/');
  });
});

describe('stripBase', () => {
  test('returns the base-relative route', () => {
    expect(stripBase('/GENSLATE/apps/terminal/', '/GENSLATE/')).toBe('/apps/terminal/');
    expect(stripBase('/GENSLATE/docs/faq', '/GENSLATE/')).toBe('/docs/faq/');
    expect(stripBase('/GENSLATE', '/GENSLATE/')).toBe('/');
    expect(stripBase('/GENSLATE/apps/index.html', '/GENSLATE/')).toBe('/apps/');
  });

  test('rejects paths outside the site', () => {
    expect(stripBase('/other/', '/GENSLATE/')).toBeUndefined();
  });

  test('works for a root site', () => {
    expect(stripBase('/download/', '/')).toBe('/download/');
  });
});

describe('withBase', () => {
  test('builds hrefs under the base, keeping hashes', () => {
    expect(withBase('/docs/launcher/', '/GENSLATE/')).toBe('/GENSLATE/docs/launcher/');
    expect(withBase('/docs/launcher/#tabs', '/GENSLATE/')).toBe('/GENSLATE/docs/launcher/#tabs');
    expect(withBase('/', '/')).toBe('/');
  });
});
