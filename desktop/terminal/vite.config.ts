import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1440 (HMR 1441) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1440 });
