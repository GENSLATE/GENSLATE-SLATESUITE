import { Kbd } from '@genslate/design-system';
import { StateMatrix } from '../../components/state-matrix.component';

const SHORTCUTS = ['mod+k', 'mod+shift+p', 'alt+up', 'ctrl+tab', 'esc'] as const;

export function KbdSection() {
  return (
    <StateMatrix
      caption="Shortcuts per platform"
      columns={['macOS', 'Windows', 'Linux', 'Inline (macOS)', 'Inline (Windows)']}
      rows={SHORTCUTS.map((shortcut) => ({
        label: shortcut,
        cells: [
          <Kbd key="mac" shortcut={shortcut} platform="macos" />,
          <Kbd key="win" shortcut={shortcut} platform="windows" />,
          <Kbd key="linux" shortcut={shortcut} platform="linux" size="sm" />,
          <Kbd key="inline-mac" shortcut={shortcut} platform="macos" variant="inline" />,
          <Kbd key="inline-win" shortcut={shortcut} platform="windows" variant="inline" />,
        ],
      }))}
    />
  );
}
