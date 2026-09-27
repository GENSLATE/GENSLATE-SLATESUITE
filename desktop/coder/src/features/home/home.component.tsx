import type { AppInfo } from '@genslate/tauri-bridge';
import { APP } from '../../app/app.meta';

interface HomeProps {
  /** Build metadata from the running binary; `null` in a browser (bundled version shown). */
  readonly info: AppInfo | null;
}

/** The content area: the app's icon, name and version — the starting point for its real UI. */
export function Home({ info }: HomeProps) {
  const version = info?.version ?? APP.version;

  return (
    <div data-slot="home" className="grid flex-1 place-items-center overflow-auto p-10">
      <div className="flex flex-col items-center text-center">
        <img
          src={APP.icon}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none mb-5 size-32 select-none"
        />
        <p className="font-medium text-fg-muted text-xs uppercase tracking-widest">GENSLATE</p>
        <h1 className="mt-1 font-semibold text-3xl text-fg-strong">{APP.name}</h1>
        <p className="mt-2 text-fg-secondary text-sm tabular-nums">
          Version {version}
          {info?.debug ? ' · debug build' : ''}
        </p>
      </div>
    </div>
  );
}
