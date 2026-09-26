import { type MouseEvent, useContext } from 'react';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon';
import type { TreeItemProps } from './tree.types';
import { treeVariants } from './tree.variants';
import { TreeLevelContext, useTreeContext } from './tree-context';

/** Horizontal geometry (px): row inset, indent per level, and the chevron column centre. */
const ROW_INSET = 4;
const INDENT = 12;
const GUIDE_OFFSET = 8;

function hasNodes(children: TreeItemProps['children']): boolean {
  if (children == null || children === false) return false;
  return !(Array.isArray(children) && children.every((child) => child == null || child === false));
}

/** One node of a `Tree`. Nest `TreeItem`s as children to make it expandable. */
export function TreeItem({
  id,
  label,
  textValue,
  icon,
  expandedIcon,
  trailing,
  disabled = false,
  children,
  className,
  onClick,
  onDoubleClick,
  ...props
}: TreeItemProps) {
  const tree = useTreeContext();
  const level = useContext(TreeLevelContext);
  const parent = hasNodes(children);
  const open = parent && tree.isExpanded(id);
  const isSelected = tree.selected === id;
  const styles = treeVariants({ indentGuides: tree.indentGuides });
  const glyph = open && expandedIcon ? expandedIcon : icon;

  const handleClick = (event: MouseEvent<HTMLLIElement>) => {
    onClick?.(event);
    // Clicks bubble through ancestor items; only the innermost handles it.
    if (event.defaultPrevented) return;
    event.stopPropagation();
    tree.focusItem(id);
    if (disabled) return;
    tree.select(id);
    if (parent) tree.toggle(id);
  };

  const handleDoubleClick = (event: MouseEvent<HTMLLIElement>) => {
    onDoubleClick?.(event);
    if (event.defaultPrevented) return;
    event.stopPropagation();
    if (!parent && !disabled) tree.action(id);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard interaction is handled by the parent <Tree> (APG).
    <li
      role="treeitem"
      data-id={id}
      data-text={textValue ?? (typeof label === 'string' ? label : '')}
      data-slot="tree-item"
      aria-level={level}
      aria-expanded={parent ? open : undefined}
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      tabIndex={tree.focusedId === id ? 0 : -1}
      className={cn(styles.item(), className)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onFocus={(event) => {
        if (event.target === event.currentTarget && tree.focusedId !== id) tree.focusItem(id);
      }}
      {...props}
    >
      <div
        data-slot="tree-item-row"
        data-selected={isSelected ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={styles.row()}
        style={{ paddingLeft: ROW_INSET + (level - 1) * INDENT }}
      >
        {Array.from({ length: level - 1 }, (_, depth) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: guides are positional.
            key={depth}
            aria-hidden
            data-slot="tree-item-guide"
            className={styles.guide()}
            style={{ left: ROW_INSET + depth * INDENT + GUIDE_OFFSET }}
          />
        ))}
        {parent ? (
          <span
            data-slot="tree-item-chevron"
            data-expanded={open ? '' : undefined}
            className={styles.chevron()}
          >
            <Icon name="codicon:chevron-right" size={16} />
          </span>
        ) : (
          <span aria-hidden className={styles.spacer()} />
        )}
        {glyph != null && <Icon name={glyph} size={16} className={styles.icon()} />}
        <span data-slot="tree-item-label" className={styles.label()}>
          {label}
        </span>
        {trailing != null && (
          <span data-slot="tree-item-trailing" className={styles.trailing()}>
            {trailing}
          </span>
        )}
      </div>
      {open && (
        // biome-ignore lint/a11y/useSemanticElements: APG tree groups are role="group" lists.
        <ul role="group" data-slot="tree-group" className={styles.group()}>
          <TreeLevelContext value={level + 1}>{children}</TreeLevelContext>
        </ul>
      )}
    </li>
  );
}
