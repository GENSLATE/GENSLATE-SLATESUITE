/**
 * bun test preload: a happy-dom browser environment + jest-dom matchers + Testing Library
 * cleanup between tests. Used via `bun test --preload ./tests/setup/dom.preload.ts`.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost/', width: 1280, height: 800 });

const { afterEach, expect } = await import('bun:test');
const matchers = await import('@testing-library/jest-dom/matchers');
const { cleanup } = await import('@testing-library/react');

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);
afterEach(() => {
  cleanup();
});
