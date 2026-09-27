import { themeInitScript } from '@genslate/design-system/theme-init';
import type { Plugin } from 'vite';

/**
 * The first thing in <head>: the design system's theme bootstrap (so the first paint is already
 * Polar Night or Snow Storm) plus `data-js`, which lets CSS hold animations until scripts run.
 * The prerender step hashes this exact script for the Content-Security-Policy.
 */
export const HEAD_SCRIPT = `${themeInitScript}document.documentElement.setAttribute("data-js","");`;

export function themeInit(): Plugin {
  return {
    name: 'genslate-theme-init',
    transformIndexHtml: () => [{ tag: 'script', children: HEAD_SCRIPT, injectTo: 'head-prepend' }],
  };
}
