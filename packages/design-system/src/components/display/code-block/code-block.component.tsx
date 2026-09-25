import { useEffect, useState } from 'react';
import { cn } from '../../../utils/cn.util';
import { IconButton } from '../../actions/icon-button/icon-button.component';
import type { CodeBlockProps } from './code-block.types';
import { codeBlockVariants } from './code-block.variants';

/** Monospaced, sunken source with an optional header and copy button. No syntax highlighting. */
export function CodeBlock({
  code,
  language,
  title,
  copyable = true,
  lineNumbers = false,
  wrap = false,
  onCopy,
  labels,
  className,
  ...props
}: CodeBlockProps) {
  const styles = codeBlockVariants({ wrap });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Clipboard can be denied; still report the intent.
    }
    setCopied(true);
    onCopy?.(code);
  };

  const copyButton = copyable && (
    <IconButton
      data-slot="code-block-copy"
      size="sm"
      icon={copied ? 'codicon:check' : 'codicon:copy'}
      label={copied ? (labels?.copied ?? 'Copied') : (labels?.copy ?? 'Copy')}
      onClick={copy}
    />
  );
  const hasHeader = title != null || language != null;
  const lines = lineNumbers ? code.replace(/\n$/, '').split('\n') : null;

  return (
    <figure data-slot="code-block" className={cn(styles.root(), className)} {...props}>
      {hasHeader && (
        <figcaption data-slot="code-block-header" className={styles.header()}>
          <span className={styles.title()}>{title}</span>
          {language && <span className={styles.language()}>{language}</span>}
          {copyButton}
        </figcaption>
      )}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-reachable */}
      <pre data-slot="code-block-pre" className={styles.pre()} tabIndex={0}>
        <code>
          {lines ? (
            lines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
              <span key={index} className={styles.line()}>
                <span aria-hidden className={styles.gutter()}>
                  {index + 1}
                </span>
                <span>{line || ' '}</span>
              </span>
            ))
          ) : (
            <span className={styles.line()}>{code.replace(/\n$/, '')}</span>
          )}
        </code>
      </pre>
      {!hasHeader && copyButton && <div className={styles.floating()}>{copyButton}</div>}
      <span className="sr-only" aria-live="polite">
        {copied ? (labels?.copied ?? 'Copied') : ''}
      </span>
    </figure>
  );
}
