import { AppShell, ScrollArea, useHotkey, useTheme } from '@genslate/design-system';
import { useState } from 'react';
import { AppSidebar } from '../features/navigation/app-sidebar.component';
import { SettingsInspector } from '../features/settings/settings-inspector.component';
import { PageHeader } from '../features/showcase/components/page-header.component';
import {
  DEFAULT_SECTION_ID,
  findSection,
  groupOf,
  SHOWCASE_SECTIONS,
} from '../features/showcase/showcase.registry';
import { AppStatusBar } from '../features/statusbar/app-statusbar.component';
import { AppTitleBar } from '../features/titlebar/app-titlebar.component';
import { usePersistentState } from './use-persistent-state.hook';

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export interface AppProps {
  /** Opens the command palette (wired by the orchestrator; a no-op stub for now). */
  onOpenCommandPalette?: () => void;
}

/** GENSLATE Design Kit: titlebar · sidebar + page · status bar. */
export function App({ onOpenCommandPalette }: AppProps) {
  const [pageId, setPageId] = usePersistentState('genslate.example.page', DEFAULT_SECTION_ID, isString);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState(
    'genslate.example.sidebar-collapsed',
    false,
    isBoolean,
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { toggleTheme } = useTheme();

  const section = findSection(pageId) ?? findSection(DEFAULT_SECTION_ID);
  const group = section ? groupOf(section) : undefined;
  const openPalette = onOpenCommandPalette ?? (() => undefined);

  useHotkey('mod+b', () => setSidebarCollapsed((collapsed) => !collapsed));
  useHotkey('mod+k', openPalette);
  useHotkey('mod+shift+l', toggleTheme);

  const Page = section?.component;

  return (
    <AppShell
      persistKey="genslate.example.shell"
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
      mainLabel={section?.title}
      titleBar={
        <AppTitleBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenCommandPalette={openPalette}
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen(!inspectorOpen)}
        />
      }
      sidebar={<AppSidebar selectedId={section?.id ?? ''} onSelect={setPageId} />}
      inspector={inspectorOpen ? <SettingsInspector onClose={() => setInspectorOpen(false)} /> : undefined}
      inspectorWidth={272}
      statusBar={
        <AppStatusBar pageCount={SHOWCASE_SECTIONS.length} onOpenInspector={() => setInspectorOpen(true)} />
      }
    >
      <ScrollArea key={section?.id} className="flex-1" viewportClassName="select-text">
        {section && Page ? (
          <article className="mx-auto flex w-full max-w-content-max flex-col gap-10 px-10 pt-8 pb-16">
            <PageHeader
              eyebrow={group?.title ?? ''}
              title={section.title}
              description={section.description}
              icon={group?.icon ?? section.icon}
            />
            <Page />
          </article>
        ) : null}
      </ScrollArea>
    </AppShell>
  );
}
