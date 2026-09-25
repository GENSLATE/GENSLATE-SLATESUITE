// cspell:words tera
/**
 * A tiny renderer for `.config/moon/templates/*`, used by `new-app` when moon cannot run.
 * It supports the subset of Tera those templates use:
 *   `{{ var }}`, `{{ var + 1 }}`, `{{ var | replace(from="-", to="_") }}`, `[var]` in paths,
 * the `.tera` suffix (stripped) and `.raw` files (copied verbatim, suffix stripped).
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

export type TemplateVars = Readonly<Record<string, string | number>>;

const EXPRESSION = /\{\{\s*(.+?)\s*\}\}/g;

export function renderString(source: string, vars: TemplateVars): string {
  return source.replace(EXPRESSION, (_match, expression: string) => evaluate(expression, vars));
}

export function renderPath(path: string, vars: TemplateVars): string {
  return path.replace(/\[(\w+)\]/g, (_match, key: string) => String(lookup(key, vars)));
}

/** Renders every file of `templateDir` (except `template.yml`) into `destination`. */
export async function renderTemplate(
  templateDir: string,
  destination: string,
  vars: TemplateVars,
): Promise<string[]> {
  const written: string[] = [];
  for (const file of await listFiles(templateDir)) {
    const rel = relative(templateDir, file);
    if (rel === 'template.yml') continue;
    const raw = rel.endsWith('.raw');
    const target = join(destination, renderPath(rel.replace(/\.(raw|tera|twig)$/, ''), vars));
    const content = await readFile(file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, raw ? content : renderString(content.toString('utf8'), vars));
    written.push(target);
  }
  return written;
}

function evaluate(expression: string, vars: TemplateVars): string {
  const [head = '', ...filters] = expression.split('|').map((part) => part.trim());
  let value: string | number;
  const arithmetic = /^(\w+)\s*([+-])\s*(\d+)$/.exec(head);
  if (arithmetic !== null) {
    const [, key = '', operator, amount = '0'] = arithmetic;
    const base = Number(lookup(key, vars));
    value = operator === '+' ? base + Number(amount) : base - Number(amount);
  } else {
    value = lookup(head, vars);
  }
  for (const filter of filters) value = applyFilter(filter, String(value));
  return String(value);
}

function applyFilter(filter: string, value: string): string {
  const replace = /^replace\(\s*from\s*=\s*"([^"]*)"\s*,\s*to\s*=\s*"([^"]*)"\s*\)$/.exec(filter);
  if (replace !== null) return value.replaceAll(replace[1] ?? '', replace[2] ?? '');
  if (filter === 'upper') return value.toUpperCase();
  if (filter === 'lower') return value.toLowerCase();
  throw new Error(`template: unsupported filter "${filter}"`);
}

function lookup(key: string, vars: TemplateVars): string | number {
  const value = vars[key];
  if (value === undefined) throw new Error(`template: unknown variable "${key}"`);
  return value;
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}
