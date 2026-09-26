import { cn } from '../../../utils/cn.util';
import type { PanelBodyProps, PanelFooterProps, PanelHeaderProps, PanelProps } from './panel.types';
import { panelVariants } from './panel.variants';

/** A titled view region (VS Code view / macOS inspector pane). */
export function Panel({ surface = 'panel', className, ...props }: PanelProps) {
  return (
    <section
      data-slot="panel"
      className={cn(panelVariants({ surface }).root(), className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  actions,
  actionsVisible = false,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  const styles = panelVariants({ actionsVisible });
  return (
    <header data-slot="panel-header" className={cn(styles.header(), className)} {...props}>
      {title != null && <h2 className={styles.title()}>{title}</h2>}
      {children}
      {actions != null && (
        <div data-slot="panel-header-actions" className={styles.actions()}>
          {actions}
        </div>
      )}
    </header>
  );
}

export function PanelBody({ className, ...props }: PanelBodyProps) {
  return (
    <div data-slot="panel-body" className={cn(panelVariants().body(), className)} {...props} />
  );
}

export function PanelFooter({ className, ...props }: PanelFooterProps) {
  return (
    <footer
      data-slot="panel-footer"
      className={cn(panelVariants().footer(), className)}
      {...props}
    />
  );
}
