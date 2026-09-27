import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1436 (HMR 1437) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1436 });
