import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useControllableState } from '../../../src/hooks/use-controllable-state.hook';
import { matchesHotkey, parseHotkey, useHotkey } from '../../../src/hooks/use-hotkey.hook';
import { PlatformProvider } from '../../../src/providers/platform';

function key(init: KeyboardEventInit & { key: string }) {
  return new KeyboardEvent('keydown', init);
}

describe('parseHotkey / matchesHotkey', () => {
  test('mod is meta on macOS and ctrl elsewhere', () => {
    expect(matchesHotkey(key({ key: 'k', metaKey: true }), parseHotkey('mod+k', 'macos'))).toBe(
      true,
    );
    expect(matchesHotkey(key({ key: 'k', ctrlKey: true }), parseHotkey('mod+k', 'macos'))).toBe(
      false,
    );
    expect(matchesHotkey(key({ key: 'k', ctrlKey: true }), parseHotkey('mod+k', 'windows'))).toBe(
      true,
    );
  });

  test('modifiers must match exactly and codes back up option-altered keys', () => {
    const hotkey = parseHotkey('mod+shift+l', 'linux');
    expect(matchesHotkey(key({ key: 'L', ctrlKey: true, shiftKey: true }), hotkey)).toBe(true);
    expect(matchesHotkey(key({ key: 'l', ctrlKey: true }), hotkey)).toBe(false);
    expect(
      matchesHotkey(key({ key: '¬', code: 'KeyL', altKey: true }), parseHotkey('alt+l', 'macos')),
    ).toBe(true);
    expect(matchesHotkey(key({ key: 'Escape' }), parseHotkey('esc', 'macos'))).toBe(true);
  });
});

function HotkeyProbe({ onHit, shortcut }: { onHit: () => void; shortcut: string }) {
  useHotkey(shortcut, onHit);
  return <input aria-label="field" />;
}

describe('useHotkey', () => {
  test('fires on the platform shortcut, not for bare keys in inputs', async () => {
    const user = userEvent.setup();
    const onHit = mock();
    const onBare = mock();
    render(
      <PlatformProvider platform="windows">
        <HotkeyProbe shortcut="mod+b" onHit={onHit} />
        <HotkeyProbe shortcut="/" onHit={onBare} />
      </PlatformProvider>,
    );
    await user.keyboard('{Control>}b{/Control}');
    expect(onHit).toHaveBeenCalledTimes(1);
    await user.click(screen.getAllByRole('textbox', { name: 'field' })[0] as HTMLElement);
    await user.keyboard('/');
    expect(onBare).not.toHaveBeenCalled();
    await user.keyboard('{Control>}b{/Control}');
    expect(onHit).toHaveBeenCalledTimes(2);
  });
});

function Controllable({ value, onChange }: { value?: number; onChange?: (value: number) => void }) {
  const [current, setCurrent] = useControllableState({ value, defaultValue: 1, onChange });
  return (
    <button type="button" onClick={() => setCurrent((prev) => prev + 1)}>
      {current}
    </button>
  );
}

function ControlledHost() {
  const [value, setValue] = useState(10);
  return <Controllable value={value} onChange={setValue} />;
}

describe('useControllableState', () => {
  test('uncontrolled updates internally and notifies', async () => {
    const user = userEvent.setup();
    const onChange = mock();
    render(<Controllable onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('2');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('controlled follows the parent', async () => {
    const user = userEvent.setup();
    render(<ControlledHost />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('12');
  });
});
