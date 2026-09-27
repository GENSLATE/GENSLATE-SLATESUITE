import { cn } from '@genslate/design-system';

import { AppContextMenu } from '../features/apps/app-context-menu.component';
import { AppDetails, RunWithArgs } from '../features/apps/app-details.component';
import { AppList } from '../features/apps/app-list.component';
import { optionId } from '../features/apps/app-row.component';
import { SourceTabs } from '../features/apps/source-tabs.component';
import { CommandBar } from '../features/command-bar/command-bar.component';
import { suggestionId } from '../features/command-bar/slash-menu.component';
import { LauncherContextMenu } from '../features/frame/launcher-context-menu.component';
import { LauncherFrame } from '../features/frame/launcher-frame.component';
import { LauncherTitleBar } from '../features/frame/launcher-titlebar.component';
import { DocumentsRail } from '../features/rail/documents-rail.component';
import { ToolsButton } from '../features/rail/tools-button.component';
import { LauncherStatusBar } from '../features/status/launcher-status-bar.component';
import { HelpView } from '../features/tools/help-view.component';
import { ToolsView } from '../features/tools/tools-view.component';
import { useLauncher } from './launcher.context';
import { useLauncherController } from './use-launcher-controller.hook';
import { useLauncherHotkeys } from './use-launcher-hotkeys.hook';

const LISTBOX_ID = 'launcher-apps';
const SLASH_ID = 'launcher-slash';

/** The launcher: bezel frame, recessed apps well, documents rail, command bar, status bar. */
export function App() {
  const { backend, context, settings, list, pinned, showCount } = useLauncher();
  const c = useLauncherController();
  const keys = settings.keybindings.launcher;
  useLauncherHotkeys(keys, {
    focusSearch: () => c.inputRef.current?.focus(),
    toggleTools: c.toggleTools,
    togglePin: c.togglePin,
    toggleFavorite: () => {
      if (c.activeApp !== undefined) c.toggleFavorite(c.activeApp);
    },
    selectTab: c.changeTab,
  });

  const setPopupOpen = (open: boolean) => backend.setPopupOpen(open).catch(c.notify);
  const find = (id: string) => list.apps.find((app) => app.id === id);
  const slashIndexId = c.activeIndex >= 0 ? suggestionId(SLASH_ID, c.activeIndex) : undefined;
  const activeDescendant = c.slash.active ? slashIndexId : c.activeApp && optionId(c.activeIndex);
  const subview = c.view.kind === 'help' || c.view.kind === 'details' || c.view.kind === 'args';

  const detailsApp =
    c.view.kind === 'details' || c.view.kind === 'args' ? find(c.view.id) : undefined;
  const back = () => c.setView({ kind: 'apps' });

  const appsPane = (
    <div
      className={cn(
        'absolute inset-y-0 right-0 flex w-[calc(var(--launcher-normal)-var(--spacing-launcher-rail)-0.5rem)] flex-col',
        'transition-opacity duration-base ease-standard',
        c.expanded && 'pointer-events-none opacity-0',
      )}
      aria-hidden={c.expanded || undefined}
    >
      {c.view.kind === 'help' ? (
        <HelpView actions={context.actions} keybindings={settings.keybindings} onBack={back} />
      ) : detailsApp !== undefined && c.view.kind === 'details' ? (
        <AppDetails
          app={detailsApp}
          onBack={back}
          onLaunch={() => c.launch(detailsApp)}
          onOpenFolder={() => backend.openAppFolder(detailsApp.id).catch(c.notify)}
          onToggleFavorite={() => c.toggleFavorite(detailsApp)}
        />
      ) : detailsApp !== undefined && c.view.kind === 'args' ? (
        <RunWithArgs app={detailsApp} onBack={back} onRun={(args) => c.launch(detailsApp, args)} />
      ) : (
        <>
          <SourceTabs tabs={list.tabs} value={c.tab} onChange={c.changeTab} />
          <div className="min-h-0 flex-1">
            <AppContextMenu
              apps={list.apps}
              favoriteShortcut={keys.toggleFavorite}
              onOpenChange={setPopupOpen}
              actions={{
                launch: (app) => c.launch(app),
                runWithArgs: (app) => c.setView({ kind: 'args', id: app.id }),
                toggleFavorite: c.toggleFavorite,
                openFolder: (app) => backend.openAppFolder(app.id).catch(c.notify),
                hide: (app) => backend.setOverride(app.id, { hidden: true }).catch(c.notify),
                properties: (app) => c.setView({ kind: 'details', id: app.id }),
              }}
            >
              <AppList
                groups={c.groups}
                results={c.results}
                query={c.query}
                collapsed={c.collapsed}
                activeIndex={c.slash.active ? -1 : c.activeIndex}
                launchingId={c.launchingId}
                animationKey={`${c.tab}:${showCount}:${c.groups === null ? 'search' : 'browse'}`}
                listboxId={LISTBOX_ID}
                onToggleGroup={c.toggleGroup}
                onActivate={c.setActiveIndex}
                onLaunch={c.launch}
                onToggleFavorite={c.toggleFavorite}
              />
            </AppContextMenu>
          </div>
        </>
      )}
    </div>
  );

  return (
    <LauncherContextMenu
      pinned={pinned}
      pinShortcut={keys.togglePin}
      onTogglePin={c.togglePin}
      toolsOpen={c.expanded}
      toolsShortcut={keys.toggleTools}
      onToggleTools={c.toggleTools}
      onShowHelp={() => c.setView({ kind: 'help' })}
      onHide={() => backend.hide().catch(c.notify)}
      statusMode={c.statusMode}
      onStatusModeChange={c.changeStatusMode}
      onOpenSettings={() => backend.openConfigFile('settings').catch(c.notify)}
      onOpenFolder={(folder) => backend.openFolder(folder).catch(c.notify)}
      onOpenChange={setPopupOpen}
      onError={c.notify}
    >
      <LauncherFrame
        expanded={c.expanded}
        titleBar={
          <LauncherTitleBar
            pinned={pinned}
            pinShortcut={keys.togglePin}
            onTogglePin={c.togglePin}
            onMinimize={() => backend.hide().catch(c.notify)}
            onClose={() => backend.hide().catch(c.notify)}
          />
        }
        well={
          <div
            data-slot="launcher-well"
            className="launcher-well-clip absolute inset-0 bg-surface-sunken shadow-inset"
          >
            {appsPane}
            {c.expanded ? (
              <div className="absolute inset-0 pl-2">
                <ToolsView onClose={c.toggleTools} />
              </div>
            ) : null}
          </div>
        }
        rail={
          <DocumentsRail
            profile={context.profile}
            suiteName={context.suiteName}
            onOpenFolder={(folder) => backend.openFolder(folder).catch(c.notify)}
          />
        }
        commandBar={
          <CommandBar
            inputRef={c.inputRef}
            value={c.query}
            onChange={c.changeQuery}
            onKeyDown={c.onKeyDown}
            controls={c.slash.active ? SLASH_ID : LISTBOX_ID}
            activeDescendant={subview ? undefined : activeDescendant}
            focusShortcut={keys.focusSearch}
            aiOpen={c.aiOpen}
            onAiOpenChange={(open) => {
              c.setAiOpen(open);
              setPopupOpen(open);
            }}
            slash={
              c.slash.active
                ? {
                    id: SLASH_ID,
                    suggestions: c.slash.suggestions,
                    activeIndex: c.activeIndex,
                    hint:
                      c.slashHint ??
                      (c.slash.action?.id === 'ask'
                        ? 'The AI assistant is coming soon — press Enter to learn more.'
                        : undefined),
                    onHover: c.setActiveIndex,
                    onChoose: (index) => c.choose(c.slash.suggestions[index]),
                  }
                : null
            }
          />
        }
        railFooter={
          <ToolsButton expanded={c.expanded} shortcut={keys.toggleTools} onToggle={c.toggleTools} />
        }
        statusBar={
          <LauncherStatusBar
            mode={c.statusMode}
            onModeChange={c.changeStatusMode}
            onOpenSettings={() => backend.openConfigFile('settings').catch(c.notify)}
          />
        }
      />
    </LauncherContextMenu>
  );
}
