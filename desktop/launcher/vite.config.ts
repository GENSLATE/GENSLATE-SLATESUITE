import { fileURLToPath } from 'node:url';

import { defineTauriViteConfig } from '@genslate/config-vite';

const page = (name: string) => fileURLToPath(new URL(name, import.meta.url));

// Port 1422 (HMR 1423) must match `build.devUrl` in src-tauri/tauri.conf.json.
// Two pages: the launcher (`index.html`) and the tray icon's menu window (`tray-menu.html`).
export default defineTauriViteConfig({
  port: 1422,
  overrides: {
    build: {
      rolldownOptions: {
        input: { main: page('index.html'), 'tray-menu': page('tray-menu.html') },
      },
    },
  },
});
