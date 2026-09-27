import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1442 (HMR 1443) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1442 });
