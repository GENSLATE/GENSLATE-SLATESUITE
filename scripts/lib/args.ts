import { parseArgs } from 'node:util';

import { color, log } from './log';
import { CommandFailedError } from './run';

type OptionSpec =
  | { readonly type: 'boolean'; readonly short?: string; readonly description: string }
  | {
      readonly type: 'string';
      readonly short?: string;
      readonly description: string;
      readonly default?: string;
    };

type Options = Readonly<Record<string, OptionSpec>>;

type Values<O extends Options> = {
  readonly [K in keyof O]: O[K] extends { type: 'boolean' } ? boolean : string | undefined;
};

export interface CommandContext<O extends Options> {
  readonly values: Values<O>;
  readonly positionals: readonly string[];
}

export interface CommandDefinition<O extends Options> {
  /** `bun run <name>`. */
  readonly name: string;
  /** One-line summary. */
  readonly summary: string;
  /** Usage line after `bun run <name>`, e.g. `[app] [--web]`. */
  readonly usage?: string;
  readonly options: O;
  /** Extra help text (examples, notes). */
  readonly details?: string;
  readonly run: (context: CommandContext<O>) => Promise<void> | void;
}

/**
 * Parses `process.argv`, prints `--help`, runs the command and maps failures to exit codes:
 * a failed child process exits with its code; any other error prints and exits with 1.
 */
export async function defineCommand<O extends Options>(
  definition: CommandDefinition<O>,
): Promise<void> {
  const spec = {
    ...definition.options,
    help: { type: 'boolean', short: 'h', description: 'Show this help.' },
  } as const;
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: Bun.argv.slice(2),
      options: Object.fromEntries(
        Object.entries(spec).map(([key, option]) => [
          key,
          {
            type: option.type,
            ...(option.short === undefined ? {} : { short: option.short }),
            ...('default' in option && option.default !== undefined
              ? { default: option.default }
              : {}),
          },
        ]),
      ),
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    printHelp(definition);
    process.exit(2);
  }

  if (parsed.values['help'] === true) {
    printHelp(definition);
    return;
  }

  const values = Object.fromEntries(
    Object.entries(definition.options).map(([key, option]) => {
      const value = parsed.values[key];
      return [
        key,
        option.type === 'boolean' ? value === true : typeof value === 'string' ? value : undefined,
      ];
    }),
  ) as Values<O>;

  try {
    await definition.run({ values, positionals: parsed.positionals });
  } catch (error) {
    if (error instanceof CommandFailedError) {
      log.error(error.message);
      process.exit(error.code === 0 ? 1 : error.code);
    }
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/** Throws a usage error (exit code 1 with a message). */
export function fail(message: string): never {
  throw new Error(message);
}

function printHelp<O extends Options>(definition: CommandDefinition<O>): void {
  const lines = [
    `${color.bold(`bun run ${definition.name}`)}${definition.usage === undefined ? '' : ` ${definition.usage}`}`,
    '',
    definition.summary,
    '',
    color.bold('Options'),
  ];
  const entries = Object.entries({
    ...definition.options,
    help: { type: 'boolean', short: 'h', description: 'Show this help.' },
  } satisfies Options);
  const labels = entries.map(([key, option]) => {
    const short = option.short === undefined ? '    ' : `-${option.short}, `;
    return `${short}--${key}${option.type === 'string' ? ' <value>' : ''}`;
  });
  const width = Math.max(...labels.map((label) => label.length));
  entries.forEach(([, option], index) => {
    lines.push(`  ${(labels[index] ?? '').padEnd(width)}  ${option.description}`);
  });
  if (definition.details !== undefined) lines.push('', definition.details.trim());
  console.log(lines.join('\n'));
}
