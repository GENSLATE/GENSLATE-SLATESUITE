import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1432 (HMR 1433) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1432 });
