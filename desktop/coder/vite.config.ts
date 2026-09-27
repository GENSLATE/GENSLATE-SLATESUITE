import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1428 (HMR 1429) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1428 });
