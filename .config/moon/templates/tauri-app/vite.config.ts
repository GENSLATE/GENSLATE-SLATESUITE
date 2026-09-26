import { defineTauriViteConfig } from '@genslate/config-vite';

// Port {{ port }} (HMR {{ port + 1 }}) must match `build.devUrl` in src-tauri/tauri.conf.json.
export default defineTauriViteConfig({ port: {{ port }} });
