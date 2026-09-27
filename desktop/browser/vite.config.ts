import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1426 (HMR 1427) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1426 });
