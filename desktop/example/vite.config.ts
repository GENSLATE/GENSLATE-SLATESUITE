import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1420 (HMR 1421) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1420 });
