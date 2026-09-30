import {
  Badge,
  IconButton,
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '@genslate/design-system';
import { useEffect, useEffectEvent } from 'react';

import { COMMANDS, type CommandId, command, isEnabled } from '../../app/commands.registry';
import { useGallery } from '../../app/gallery.context';
import type { MediaItem } from '../../ipc/gallery.types';
import { formatFullDate } from '../../model/format.util';
import { SMART_ACTIONS } from '../toolbar/selection-bar.component';
import { FilmStrip } from './film-strip.component';
import { RatingStars } from './rating-stars.component';
import { useZoomPan } from './use-zoom-pan.hook';
import { ViewerStage } from './viewer-stage.component';

/** Keys the viewer handles itself (the rest are commands). */
function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * One photo or video at a time: the picture (zoom with the wheel, pan by dragging), previous
 * and next, a film strip, and the photo's actions. The info panel stays beside it.
 */
export function Viewer({ id }: { readonly id: number }) {
  const api = useGallery();
  const zoom = useZoomPan();
  const index = api.items.findIndex((item) => item.id === id);
  const item = api.items[index];
  const previous = api.items[index - 1];
  const next = api.items[index + 1];

  const go = (target: MediaItem | undefined) => {
    if (target === undefined) return;
    zoom.reset();
    api.openViewer(target.id);
  };
  const close = () => api.setMode({ type: 'browse' });

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      typing(event.target) ||
      api.dialog.type !== 'none' ||
      api.paletteOpen
    )
      return;
    if (event.target instanceof Element && event.target.closest('[role="menu"], [role="dialog"]'))
      return;
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft' && plain) go(previous);
    else if (event.key === 'ArrowRight' && plain) go(next);
    else if (event.key === 'Home' && plain) go(api.items[0]);
    else if (event.key === 'End' && plain) go(api.items.at(-1));
    else if ((event.key === '+' || event.key === '=') && plain) zoom.zoomBy(1.5);
    else if (event.key === '-' && plain) zoom.zoomBy(1 / 1.5);
    else return;
    event.preventDefault();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  // The photo left the list (trashed, filtered out): back to the grid.
  useEffect(() => {
    if (item === undefined && !api.loading) api.setMode({ type: 'browse' });
  });

  if (item === undefined) return null;

  return (
    <section
      aria-label={`Viewer: ${item.name}`}
      data-slot="viewer"
      data-context-zone="viewer"
      className="flex min-h-0 flex-1 flex-col bg-canvas"
    >
      <ViewerBar item={item} position={`${index + 1} of ${api.items.length}`} onClose={close} />
      <div className="relative flex min-h-0 flex-1">
        <ViewerStage key={item.id} item={item} zoom={zoom} />
        <NavButton side="left" disabled={previous === undefined} onClick={() => go(previous)} />
        <NavButton side="right" disabled={next === undefined} onClick={() => go(next)} />
      </div>
      <FilmStrip
        items={api.items}
        currentId={item.id}
        onPick={(target) => go(api.itemById(target))}
      />
    </section>
  );
}

function NavButton({
  side,
  disabled,
  onClick,
}: {
  readonly side: 'left' | 'right';
  readonly disabled: boolean;
  readonly onClick: () => void;
}) {
  if (disabled) return null;
  return (
    <IconButton
      variant="secondary"
      size="lg"
      icon={side === 'left' ? 'codicon:chevron-left' : 'codicon:chevron-right'}
      label={side === 'left' ? 'Previous' : 'Next'}
      tooltipShortcut={side === 'left' ? 'left' : 'right'}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full shadow-control ${side === 'left' ? 'left-3' : 'right-3'}`}
    />
  );
}

interface ViewerBarProps {
  readonly item: MediaItem;
  readonly position: string;
  readonly onClose: () => void;
}

function ViewerBar({ item, position, onClose }: ViewerBarProps) {
  const api = useGallery();
  const run = (id: CommandId) => {
    const entry = command(id);
    if (isEnabled(entry, api)) entry.run(api);
  };
  const action = (id: CommandId, label?: string) => {
    const entry = command(id);
    return (
      <IconButton
        size="md"
        icon={entry.icon ?? 'codicon:circle'}
        label={label ?? entry.label}
        tooltipShortcut={entry.shortcut}
        disabled={!isEnabled(entry, api)}
        onClick={() => run(id)}
      />
    );
  };

  return (
    <div className="hairline-b flex h-12 shrink-0 items-center gap-1 px-2">
      <IconButton
        size="md"
        icon="codicon:arrow-left"
        label="Back to the photos"
        tooltipShortcut="escape"
        onClick={onClose}
      />
      <div className="flex min-w-0 flex-col px-1 leading-tight">
        <span className="truncate font-medium text-fg-strong text-sm">{item.name}</span>
        <span className="truncate text-fg-muted text-xs tabular-nums">
          {formatFullDate(item.date)} · {position}
        </span>
      </div>
      <div className="flex-1" />
      <IconButton
        size="md"
        icon={item.favorite ? 'codicon:heart-filled' : 'codicon:heart'}
        label={item.favorite ? 'Remove from favorites' : 'Favorite'}
        tooltipShortcut="f"
        toggled={item.favorite}
        disabled={item.trashed}
        onClick={() => api.favorite([item.id], !item.favorite)}
      />
      <RatingStars
        rating={item.rating}
        disabled={item.trashed}
        onRate={(rating) => api.rate([item.id], rating)}
      />
      <span className="mx-1 h-5 w-px bg-border-subtle" />
      {action('edit')}
      {action('slideshow')}
      <Menu>
        <MenuTrigger
          render={
            <IconButton size="md" icon="codicon:sparkle" label="Smart actions (coming soon)" />
          }
        />
        <MenuPopup align="end" className="w-64">
          <MenuGroup>
            <MenuGroupLabel className="flex items-center gap-2">
              Smart actions
              <Badge tone="accent" size="sm" pill>
                Coming soon
              </Badge>
            </MenuGroupLabel>
            {COMMANDS.filter((entry) => SMART_ACTIONS.includes(entry.id)).map((entry) => (
              <MenuItem key={entry.id} icon={entry.icon} disabled>
                {entry.label}
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>
      <Menu>
        <MenuTrigger
          render={<IconButton size="md" icon="codicon:ellipsis" label="More actions" />}
        />
        <MenuPopup align="end">
          {(['rename', 'add-tag', 'new-album', 'export', 'move', 'copy-to'] as const).map((id) => (
            <MoreItem key={id} id={id} onRun={run} />
          ))}
          <MenuSeparator />
          {(['open-default', 'reveal', 'copy-path'] as const).map((id) => (
            <MoreItem key={id} id={id} onRun={run} />
          ))}
          <MenuSeparator />
          {item.trashed ? (
            <MoreItem id="restore" onRun={run} />
          ) : (
            <MoreItem id="trash" onRun={run} />
          )}
        </MenuPopup>
      </Menu>
      {action('trash')}
    </div>
  );
}

function MoreItem({
  id,
  onRun,
}: {
  readonly id: CommandId;
  readonly onRun: (id: CommandId) => void;
}) {
  const api = useGallery();
  const entry = command(id);
  return (
    <MenuItem
      icon={entry.icon}
      shortcut={entry.shortcut}
      disabled={!isEnabled(entry, api)}
      tone={id === 'trash' ? 'danger' : 'default'}
      onClick={() => onRun(id)}
    >
      {entry.label}
    </MenuItem>
  );
}
