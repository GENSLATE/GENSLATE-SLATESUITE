import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1430 (HMR 1431) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1430 });
