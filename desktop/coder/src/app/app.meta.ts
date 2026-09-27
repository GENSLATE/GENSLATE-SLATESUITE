import appIcon from '../../../../other/resources/icons/genslate/coder.svg';
import pkg from '../../package.json';

/** Who this app is: shown in the titlebar, the home view and the status bar. */
export const APP = {
  /** Kebab-case id: moon project, config and log folders, storage prefix. */
  id: 'coder',
  /** Short name. */
  name: 'Coder',
  /** `productName` in src-tauri/tauri.conf.json. */
  productName: 'GENSLATE Coder',
  /** Bundled version; the running binary reports its own through `get_app_info`. */
  version: pkg.version,
  /** The app icon, from the GENSLATE icon family (`other/resources/icons/genslate/`). */
  icon: appIcon,
} as const;
