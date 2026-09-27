/**
 * Build-time syntax highlighting with Shiki's CSS-variables theme: tokens are coloured with
 * `var(--shiki-token-*)`, which `src/styles/syntax.css` maps to Nord per theme — one output,
 * both Polar Night and Snow Storm, no client-side highlighter.
 */
import { createCssVariablesTheme, createHighlighter } from 'shiki';

const THEME_NAME = 'genslate-nord';

const THEME = createCssVariablesTheme({
  name: THEME_NAME,
  variablePrefix: '--shiki-',
  fontStyle: true,
});

const LANGUAGES = [
  'bash',
  'css',
  'diff',
  'html',
  'json',
  'jsonc',
  'markdown',
  'powershell',
  'rust',
  'toml',
  'tsx',
  'typescript',
  'yaml',
] as const;

const ALIASES: Readonly<Record<string, string>> = {
  sh: 'bash',
  shell: 'bash',
  console: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  ts: 'typescript',
  md: 'markdown',
  rs: 'rust',
  yml: 'yaml',
};

/** One token of a highlighted line (for React-rendered mockups). */
export interface SnippetToken {
  readonly text: string;
  /** A `var(--shiki-token-*)` colour, or undefined for the default foreground. */
  readonly color?: string;
  readonly italic?: boolean;
}

export interface Highlighter {
  /** Code → a `<pre class="shiki">` element. Unknown languages render as plain text. */
  html(code: string, language: string): string;
  /** Code → lines of tokens. */
  tokens(code: string, language: string): SnippetToken[][];
}

type Language = (typeof LANGUAGES)[number];

const isLanguage = (value: string): value is Language =>
  (LANGUAGES as readonly string[]).includes(value);

function resolveLanguage(language: string): Language | 'text' {
  const lang = ALIASES[language.toLowerCase()] ?? language.toLowerCase();
  return isLanguage(lang) ? lang : 'text';
}

let shared: Promise<Highlighter> | undefined;

/** The process-wide highlighter (Shiki grammars load once). */
export function getHighlighter(): Promise<Highlighter> {
  shared ??= createHighlighter({ themes: [THEME], langs: [...LANGUAGES] }).then((shiki) => ({
    html: (code, language) =>
      shiki.codeToHtml(code, { lang: resolveLanguage(language), theme: THEME }),
    tokens: (code, language) =>
      shiki.codeToTokensBase(code, { lang: resolveLanguage(language), theme: THEME }).map((line) =>
        line.map((token) => ({
          text: token.content,
          ...(token.color && !token.color.includes('foreground') ? { color: token.color } : {}),
          // FontStyle.Italic === 1 (a bit flag).
          ...((token.fontStyle ?? 0) & 1 ? { italic: true } : {}),
        })),
      ),
  }));
  return shared;
}
