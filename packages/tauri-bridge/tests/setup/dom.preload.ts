/**
 * bun test preload: a happy-dom browser environment (a plain browser, not Tauri) plus
 * Testing Library cleanup. Used via `bun test --preload ./tests/setup/dom.preload.ts`.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost/', width: 1280, height: 800 });

const { afterEach } = await import('bun:test');
const { cleanup } = await import('@testing-library/react');

afterEach(() => {
  cleanup();
});
