import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1438 (HMR 1439) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1438 });
