import { defineTauriViteConfig } from '@genslate/config-vite';

// Port 1422 (HMR 1423) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: 1422 });
