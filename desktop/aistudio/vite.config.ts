import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1424 (HMR 1425) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1424 });
