import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { BreadcrumbItem, BreadcrumbsProps } from './breadcrumbs.types';
import { breadcrumbsVariants } from './breadcrumbs.variants';

/** VS Code-style path breadcrumbs: muted segments, chevron separators, the last one current. */
export function Breadcrumbs({ items, size = 'sm', className, labels, ...props }: BreadcrumbsProps) {
  const styles = breadcrumbsVariants({ size });
  const iconSize = size === 'sm' ? 14 : 16;

  const content = (item: BreadcrumbItem) => (
    <>
      {item.icon != null && <Icon name={item.icon} size={iconSize} />}
      <span className={styles.text()}>{item.label}</span>
    </>
  );

  return (
    <nav
      aria-label={
        props['aria-labelledby'] == null
          ? (props['aria-label'] ?? labels?.nav ?? 'Breadcrumbs')
          : undefined
      }
      data-slot="breadcrumbs"
      className={cn(styles.root(), className)}
      {...props}
    >
      <ol className={styles.list()}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.id} data-slot="breadcrumbs-item" className={styles.item()}>
              {last ? (
                <span
                  aria-current="page"
                  data-slot="breadcrumbs-current"
                  className={styles.current()}
                >
                  {content(item)}
                </span>
              ) : item.href != null ? (
                <a href={item.href} data-slot="breadcrumbs-link" className={styles.link()}>
                  {content(item)}
                </a>
              ) : item.onSelect != null ? (
                <button
                  type="button"
                  data-slot="breadcrumbs-link"
                  className={styles.link()}
                  onClick={item.onSelect}
                >
                  {content(item)}
                </button>
              ) : (
                <span
                  data-slot="breadcrumbs-segment"
                  className={cn(styles.current(), 'text-fg-muted')}
                >
                  {content(item)}
                </span>
              )}
              {!last && (
                <span aria-hidden data-slot="breadcrumbs-separator" className={styles.separator()}>
                  <Icon name="codicon:chevron-right" size={iconSize} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
