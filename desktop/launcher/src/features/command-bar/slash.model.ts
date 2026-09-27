/**
 * Slash commands: parses what's typed in the command bar into suggestions and a runnable
 * command. Actions come from the shell's registry (`list` in `get_context`), so the bar, the
 * tray and — later — AI agents share one vocabulary.
 */
import { fuzzyMatch } from '@genslate/design-system';

import type { ActionSpec, AppEntry, ParamSpec } from '../../ipc/launcher.types';
import { searchApps } from '../apps/catalog.model';

export type SlashSuggestion =
  /** `/op…` → the `open` command. Choosing it completes `/open `. */
  | { readonly kind: 'action'; readonly action: ActionSpec }
  /** `/open ex…` → the Explorer app, or `/theme d…` → `dark`. Choosing it runs the command. */
  | {
      readonly kind: 'value';
      readonly action: ActionSpec;
      readonly param: ParamSpec;
      readonly value: string;
      readonly label: string;
      readonly detail: string | undefined;
      /** Set for app values, to show its icon. */
      readonly app: AppEntry | undefined;
    };

export interface SlashParse {
  /** Whether the input is a slash command at all. */
  readonly active: boolean;
  /** The command, once its name is typed in full. */
  readonly action: ActionSpec | undefined;
  /** Text after the command name. */
  readonly argument: string;
  readonly suggestions: readonly SlashSuggestion[];
}

const INACTIVE: SlashParse = { active: false, action: undefined, argument: '', suggestions: [] };

export function parseSlash(
  input: string,
  actions: readonly ActionSpec[],
  apps: readonly AppEntry[],
): SlashParse {
  if (!input.startsWith('/')) return INACTIVE;
  const body = input.slice(1);
  const space = body.indexOf(' ');
  const name = (space === -1 ? body : body.slice(0, space)).toLowerCase();
  const exact = actions.find((action) => action.id === name);

  if (space === -1 || exact === undefined) {
    const matches = actions
      .map((action) => ({ action, hit: fuzzyMatch(name, `${action.id} ${action.title}`) }))
      .filter((entry) => name === '' || entry.hit !== null)
      .sort((a, b) => (b.hit?.score ?? 0) - (a.hit?.score ?? 0));
    return {
      active: true,
      action: exact,
      argument: '',
      suggestions: matches.map(({ action }) => ({ kind: 'action', action })),
    };
  }

  const argument = body.slice(space + 1);
  const param = exact.params[0];
  return {
    active: true,
    action: exact,
    argument,
    suggestions: param === undefined ? [] : valueSuggestions(exact, param, argument, apps),
  };
}

function valueSuggestions(
  action: ActionSpec,
  param: ParamSpec,
  argument: string,
  apps: readonly AppEntry[],
): SlashSuggestion[] {
  switch (param.type) {
    case 'choice':
      return param.values
        .filter((value) => value.startsWith(argument.trim().toLowerCase()))
        .map((value) => ({
          kind: 'value',
          action,
          param,
          value,
          label: value,
          detail: undefined,
          app: undefined,
        }));
    case 'app': {
      const matches =
        argument.trim() === ''
          ? [...apps].filter((app) => !app.hidden)
          : searchApps(apps, argument);
      return matches.slice(0, 8).map((app) => ({
        kind: 'value',
        action,
        param,
        value: app.id,
        label: app.name,
        detail: app.description || undefined,
        app,
      }));
    }
    case 'text':
      return [];
  }
}

/** The params to run `action` with for a typed (not picked) argument, or why it can't run. */
export function paramsFor(
  action: ActionSpec,
  argument: string,
): { readonly params: Record<string, string> } | { readonly error: string } {
  const param = action.params[0];
  const value = argument.trim();
  if (param === undefined) return { params: {} };
  if (value === '') {
    return param.required
      ? { error: `/${action.id} needs ${article(param.description)}` }
      : { params: {} };
  }
  if (param.type === 'choice' && !param.values.includes(value.toLowerCase())) {
    return { error: `Use one of: ${param.values.join(', ')}` };
  }
  return { params: { [param.name]: param.type === 'choice' ? value.toLowerCase() : value } };
}

function article(noun: string): string {
  const lower = noun.toLowerCase();
  return /^[aeiou]/.test(lower) ? `an ${lower}` : `a ${lower}`;
}
