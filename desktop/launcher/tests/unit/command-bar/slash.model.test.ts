import { describe, expect, test } from 'bun:test';

import { paramsFor, parseSlash } from '../../../src/features/command-bar/slash.model';
import { ACTIONS, app } from '../fixtures';

const APPS = [app('genslate/explorer', { description: 'Files' }), app('genslate/editor')];

describe('parseSlash', () => {
  test('plain text is not a command', () => {
    expect(parseSlash('explorer', ACTIONS, APPS).active).toBe(false);
  });

  test('"/" lists every command; a prefix narrows them', () => {
    expect(parseSlash('/', ACTIONS, APPS).suggestions).toHaveLength(ACTIONS.length);
    const narrowed = parseSlash('/th', ACTIONS, APPS).suggestions;
    expect(narrowed[0]).toMatchObject({ kind: 'action', action: { id: 'theme' } });
  });

  test('choice arguments suggest matching values', () => {
    const parse = parseSlash('/theme d', ACTIONS, APPS);
    expect(parse.action?.id).toBe('theme');
    expect(parse.suggestions.map((s) => (s.kind === 'value' ? s.value : s.kind))).toEqual(['dark']);
  });

  test('app arguments suggest apps by fuzzy name', () => {
    const parse = parseSlash('/open exp', ACTIONS, APPS);
    expect(parse.suggestions[0]).toMatchObject({
      kind: 'value',
      value: 'genslate/explorer',
      label: 'Explorer',
    });
  });

  test('text arguments have no suggestions', () => {
    expect(parseSlash('/ask what is new', ACTIONS, APPS)).toMatchObject({
      argument: 'what is new',
      suggestions: [],
    });
  });
});

describe('paramsFor', () => {
  const find = (id: string) => ACTIONS.find((action) => action.id === id);

  test('validates required and choice arguments', () => {
    const theme = find('theme');
    if (theme === undefined) throw new Error('fixture');
    expect(paramsFor(theme, ' Dark ')).toEqual({ params: { mode: 'dark' } });
    expect(paramsFor(theme, 'purple')).toEqual({ error: 'Use one of: system, dark, light' });
    expect(paramsFor(theme, '')).toEqual({ error: '/theme needs a theme' });
  });

  test('optional and parameterless actions run as they are', () => {
    const ask = find('ask');
    const tools = find('tools');
    if (ask === undefined || tools === undefined) throw new Error('fixture');
    expect(paramsFor(ask, '')).toEqual({ params: {} });
    expect(paramsFor(tools, 'ignored')).toEqual({ params: {} });
  });
});
