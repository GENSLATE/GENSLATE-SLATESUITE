import type { ComponentType } from 'react';

import { findApp } from '../../content/apps.content';
import { AiStudioMockup } from './aistudio.mockup';
import { BrowserMockup } from './browser.mockup';
import { CoderMockup } from './coder.mockup';
import { CommandMockup } from './command.mockup';
import { DesignKitMockup } from './design-kit.mockup';
import { EditorMockup } from './editor.mockup';
import { ExplorerMockup } from './explorer.mockup';
import { GalleryMockup } from './gallery.mockup';
import { JukeboxMockup } from './jukebox.mockup';
import { LauncherMockup } from './launcher.mockup';
import { MockStage } from './mock-stage.component';
import { TerminalMockup } from './terminal.mockup';
import { TheaterMockup } from './theater.mockup';
import { ToolboxMockup } from './toolbox.mockup';

interface MockupEntry {
  readonly width: number;
  readonly height: number;
  readonly Component: ComponentType;
}

const WINDOW = { width: 1120, height: 700 } as const;

const MOCKUPS: Readonly<Record<string, MockupEntry>> = {
  launcher: { width: 460, height: 700, Component: LauncherMockup },
  terminal: { ...WINDOW, Component: TerminalMockup },
  explorer: { ...WINDOW, Component: ExplorerMockup },
  editor: { ...WINDOW, Component: EditorMockup },
  coder: { ...WINDOW, Component: CoderMockup },
  browser: { ...WINDOW, Component: BrowserMockup },
  gallery: { ...WINDOW, Component: GalleryMockup },
  jukebox: { ...WINDOW, Component: JukeboxMockup },
  theater: { ...WINDOW, Component: TheaterMockup },
  command: { width: 880, height: 560, Component: CommandMockup },
  toolbox: { ...WINDOW, Component: ToolboxMockup },
  aistudio: { ...WINDOW, Component: AiStudioMockup },
  example: { width: 1280, height: 800, Component: DesignKitMockup },
};

/** Logical size of an app's window picture. */
export function mockupSize(id: string): { width: number; height: number } {
  const entry = MOCKUPS[id];
  return entry ? { width: entry.width, height: entry.height } : WINDOW;
}

/** An app's live window picture, scaled to its container. */
export function AppMockup({
  id,
  className,
  theme,
}: {
  readonly id: string;
  readonly className?: string;
  readonly theme?: 'polar-night' | 'snow-storm';
}) {
  const entry = MOCKUPS[id];
  if (!entry) return null;
  const name = findApp(id)?.name ?? id;
  const { Component } = entry;
  return (
    <MockStage
      width={entry.width}
      height={entry.height}
      label={`The GENSLATE ${name} window`}
      className={className}
      {...(theme ? { theme } : {})}
    >
      <Component />
    </MockStage>
  );
}
