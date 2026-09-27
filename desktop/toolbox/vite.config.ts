import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1444 (HMR 1445) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1444 });
