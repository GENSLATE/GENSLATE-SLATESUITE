import type { CodiconRef } from '@genslate/design-system';
import { cn, Icon, Tooltip } from '@genslate/design-system';

import type { SharedFolder } from '../../ipc/launcher.types';

const FOLDERS: readonly { folder: SharedFolder; label: string; icon: CodiconRef }[] = [
  { folder: 'desktop', label: 'Desktop', icon: 'codicon:vm' },
  { folder: 'documents', label: 'Documents', icon: 'codicon:file-text' },
  { folder: 'downloads', label: 'Downloads', icon: 'codicon:desktop-download' },
  { folder: 'music', label: 'Music', icon: 'codicon:music' },
  { folder: 'pictures', label: 'Pictures', icon: 'codicon:file-media' },
  { folder: 'videos', label: 'Videos', icon: 'codicon:device-camera-video' },
];

export interface DocumentsRailProps {
  /** Profile name (`Shared`). */
  readonly profile: string;
  /** The install folder's name, shown as the suite name. */
  readonly suiteName: string | null;
  readonly onOpenFolder: (folder: SharedFolder) => void;
}

/**
 * The right rail: who you are (profile card) and your portable folders
 * (`storage/users/shared/*`), opened in GENSLATE Explorer when installed, else the OS file
 * manager.
 */
export function DocumentsRail({ profile, suiteName, onOpenFolder }: DocumentsRailProps) {
  return (
    <nav
      aria-label="Your folders"
      data-slot="documents-rail"
      className="flex h-full flex-col px-2 pt-1.5"
    >
      <ProfileCard
        profile={profile}
        suiteName={suiteName}
        onOpenStorage={() => onOpenFolder('storage')}
      />
      <div className="mt-3 mb-1 px-2 font-semibold text-2xs text-fg-muted uppercase tracking-wider">
        Folders
      </div>
      <ul className="flex flex-col gap-px">
        {FOLDERS.map(({ folder, label, icon }, index) => (
          <li
            key={folder}
            className="launcher-slide-in"
            style={{ animationDelay: `${60 + index * 18}ms` }}
          >
            <button
              type="button"
              onClick={() => onOpenFolder(folder)}
              className={cn(
                'group/folder flex h-7 w-full cursor-default items-center gap-2 rounded-md px-2 text-fg-secondary text-sm',
                'focus-ring transition-colors duration-fast ease-standard hover:bg-fill-hover hover:text-fg-strong active:bg-fill-pressed',
              )}
            >
              <Icon
                name={icon}
                size={14}
                className="shrink-0 text-fg-muted transition-colors duration-fast group-hover/folder:text-accent-fg"
              />
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProfileCard({
  profile,
  suiteName,
  onOpenStorage,
}: {
  profile: string;
  suiteName: string | null;
  onOpenStorage: () => void;
}) {
  return (
    <Tooltip content="Open your storage folder" side="left">
      <button
        type="button"
        onClick={onOpenStorage}
        className={cn(
          'group/profile flex cursor-default flex-col items-center gap-1.5 rounded-lg px-2 pt-3 pb-2.5',
          'focus-ring transition-colors duration-fast ease-standard hover:bg-fill-hover active:bg-fill-pressed',
        )}
      >
        <span className="relative grid size-11 place-items-center rounded-full bg-accent-subtle ring-1 ring-accent-border">
          <span className="font-semibold text-accent-fg text-lg">
            {profile.charAt(0).toUpperCase()}
          </span>
          <span className="absolute -inset-1 rounded-full ring-1 ring-border-subtle transition-transform duration-moderate ease-spring group-hover/profile:scale-105" />
        </span>
        <span className="mt-0.5 max-w-full truncate font-semibold text-fg-strong text-sm">
          {profile}
        </span>
        {suiteName === null ? null : (
          <span className="max-w-full truncate text-2xs text-fg-muted uppercase tracking-wider">
            {suiteName}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
