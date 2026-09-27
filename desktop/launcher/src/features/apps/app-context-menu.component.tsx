import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@genslate/design-system';
import { type ReactNode, useState } from 'react';

import type { AppEntry } from '../../ipc/launcher.types';
import { isLaunchable } from './catalog.model';

export interface AppMenuActions {
  readonly launch: (app: AppEntry) => void;
  readonly runWithArgs: (app: AppEntry) => void;
  readonly toggleFavorite: (app: AppEntry) => void;
  readonly openFolder: (app: AppEntry) => void;
  readonly hide: (app: AppEntry) => void;
  readonly properties: (app: AppEntry) => void;
}

export interface AppContextMenuProps {
  readonly apps: readonly AppEntry[];
  readonly actions: AppMenuActions;
  readonly favoriteShortcut: string;
  /** Tells the shell a popup may extend beyond the frame (no click-through while open). */
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}

/**
 * One context menu for the whole list: right-clicking a row (anything with `data-app-id`
 * inside) opens Launch · Run with arguments… · Favorite · Open folder · Hide · Properties.
 */
export function AppContextMenu({
  apps,
  actions,
  favoriteShortcut,
  onOpenChange,
  children,
}: AppContextMenuProps) {
  const [target, setTarget] = useState<AppEntry | undefined>();

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger
        className="h-full"
        onContextMenu={(event) => {
          const id = (event.target as Element)
            .closest('[data-app-id]')
            ?.getAttribute('data-app-id');
          setTarget(apps.find((app) => app.id === id));
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuPopup>
        {target === undefined ? (
          <ContextMenuItem disabled>Right-click an app</ContextMenuItem>
        ) : (
          <>
            <ContextMenuItem
              icon="codicon:play"
              shortcut="enter"
              disabled={!isLaunchable(target)}
              onClick={() => actions.launch(target)}
            >
              Open {target.name}
            </ContextMenuItem>
            <ContextMenuItem
              icon="codicon:terminal"
              disabled={!isLaunchable(target)}
              onClick={() => actions.runWithArgs(target)}
            >
              Run with arguments…
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={target.favorite ? 'codicon:star-full' : 'codicon:star-empty'}
              shortcut={favoriteShortcut}
              onClick={() => actions.toggleFavorite(target)}
            >
              {target.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </ContextMenuItem>
            <ContextMenuItem
              icon="codicon:folder-opened"
              onClick={() => actions.openFolder(target)}
            >
              Open folder
            </ContextMenuItem>
            <ContextMenuItem icon="codicon:eye-closed" onClick={() => actions.hide(target)}>
              Hide from list
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem icon="codicon:info" onClick={() => actions.properties(target)}>
              Properties
            </ContextMenuItem>
          </>
        )}
      </ContextMenuPopup>
    </ContextMenu>
  );
}
