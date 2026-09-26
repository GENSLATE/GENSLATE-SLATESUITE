import { Collapsible } from '@base-ui/react/collapsible';
import { useRender } from '@base-ui/react/use-render';
import { type CSSProperties, useId } from 'react';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../../display/icon/icon.component';
import { renderIconSlot } from '../../display/icon/icon.slot';
import { ScrollArea } from '../scroll-area/scroll-area.component';
import type {
  SidebarContentProps,
  SidebarFooterProps,
  SidebarHeaderProps,
  SidebarItemProps,
  SidebarProps,
  SidebarSectionProps,
} from './sidebar.types';
import { sidebarVariants } from './sidebar.variants';

const styles = sidebarVariants();

/** A source-list sidebar: a `nav` landmark on the sidebar surface. */
export function Sidebar({
  className,
  'aria-label': ariaLabel = 'Sidebar',
  ...props
}: SidebarProps) {
  return (
    <nav
      data-slot="sidebar"
      aria-label={ariaLabel}
      className={cn(styles.root(), className)}
      {...props}
    />
  );
}

export function SidebarHeader({
  title,
  actions,
  className,
  children,
  ...props
}: SidebarHeaderProps) {
  return (
    <div data-slot="sidebar-header" className={cn(styles.header(), className)} {...props}>
      {title != null && <span className={styles.headerTitle()}>{title}</span>}
      {children}
      {actions != null && <div className="flex items-center gap-0.5">{actions}</div>}
    </div>
  );
}

/** The scrolling middle of the sidebar. */
export function SidebarContent({ className, viewportClassName, ...props }: SidebarContentProps) {
  return (
    <ScrollArea
      data-slot="sidebar-content"
      className={cn(styles.content(), className)}
      viewportClassName={cn(styles.contentViewport(), viewportClassName)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return <div data-slot="sidebar-footer" className={cn(styles.footer(), className)} {...props} />;
}

/** A titled, collapsible group of items. */
export function SidebarSection({
  title,
  collapsible = title != null,
  open,
  defaultOpen = true,
  onOpenChange,
  actions,
  className,
  children,
  ...props
}: SidebarSectionProps) {
  const titleId = useId();

  if (title == null || !collapsible) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: a titled list group, not a form fieldset
      <div
        data-slot="sidebar-section"
        role="group"
        aria-labelledby={title != null ? titleId : undefined}
        className={cn(styles.section(), className)}
        {...props}
      >
        {title != null && (
          <div className={styles.sectionHeader()}>
            <span id={titleId} className={cn(styles.sectionTrigger(), 'hover:text-fg-muted')}>
              {title}
            </span>
            {actions != null && <div className={styles.sectionActions()}>{actions}</div>}
          </div>
        )}
        <div className={styles.sectionPanel()}>{children}</div>
      </div>
    );
  }

  return (
    <Collapsible.Root
      data-slot="sidebar-section"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      role="group"
      aria-labelledby={titleId}
      className={cn(styles.section(), className)}
      {...props}
    >
      <div className={styles.sectionHeader()}>
        <Collapsible.Trigger
          data-slot="sidebar-section-trigger"
          id={titleId}
          className={styles.sectionTrigger()}
        >
          <span className="truncate-flex">{title}</span>
          <Icon name="codicon:chevron-right" size={12} className={styles.sectionChevron()} />
        </Collapsible.Trigger>
        {actions != null && <div className={styles.sectionActions()}>{actions}</div>}
      </div>
      <Collapsible.Panel data-slot="sidebar-section-panel" className={styles.sectionPanel()}>
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** A 28px source-list row: icon, label, optional count/badge, pill selection. */
export function SidebarItem({
  icon,
  children,
  selected = false,
  count,
  badge,
  depth = 0,
  disabled = false,
  href,
  current = 'page',
  render,
  className,
  style,
  ...props
}: SidebarItemProps) {
  const isLink = href !== undefined;
  const trailing =
    badge ??
    (count !== undefined ? (
      <span className={styles.itemCount()}>{count.toLocaleString()}</span>
    ) : null);

  return useRender({
    defaultTagName: isLink ? 'a' : 'button',
    render,
    props: {
      'data-slot': 'sidebar-item',
      'data-selected': selected || undefined,
      'data-disabled': disabled || undefined,
      'aria-current': selected ? current : undefined,
      ...(isLink
        ? { href: disabled ? undefined : href, 'aria-disabled': disabled || undefined }
        : { type: 'button', disabled }),
      className: cn(styles.item(), className),
      style:
        depth > 0
          ? ({ paddingInlineStart: `${8 + depth * 16}px`, ...style } as CSSProperties)
          : style,
      ...props,
      children: (
        <>
          {icon != null && <span className={styles.itemIcon()}>{renderIconSlot(icon, 16)}</span>}
          <span className={styles.itemLabel()}>{children}</span>
          {trailing}
        </>
      ),
    },
  });
}
