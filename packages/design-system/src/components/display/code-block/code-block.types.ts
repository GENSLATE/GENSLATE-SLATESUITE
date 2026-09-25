import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface CodeBlockProps
  extends Omit<ComponentPropsWithRef<'figure'>, 'title' | 'children' | 'onCopy'> {
  /** The source text (rendered verbatim, no highlighting). */
  code: string;
  /** Shown in the header, e.g. `tsx`, `bash`. */
  language?: string | undefined;
  /** Header title, e.g. a file name. */
  title?: ReactNode | undefined;
  /** Show a copy button. @default true */
  copyable?: boolean | undefined;
  /** Gutter line numbers. @default false */
  lineNumbers?: boolean | undefined;
  /** Wrap long lines instead of scrolling. @default false */
  wrap?: boolean | undefined;
  onCopy?: ((code: string) => void) | undefined;
  labels?: { copy?: string; copied?: string };
}
