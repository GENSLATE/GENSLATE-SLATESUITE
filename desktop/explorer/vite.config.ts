import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1434 (HMR 1435) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1434 });
