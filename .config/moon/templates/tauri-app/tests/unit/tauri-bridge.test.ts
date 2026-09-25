import { expect, test } from 'bun:test';
import { commands, detectPlatform } from '@genslate/tauri-bridge';

test('runs as a plain web page under test', async () => {
  expect(detectPlatform()).toBe('web');
  expect(await commands.appInfo()).toBeNull();
});
