import { Badge, Button, type CodiconRef, Icon } from '@genslate/design-system';

import { APP } from '../../app/app.meta';
import { useGallery } from '../../app/gallery.context';
import { baseName } from '../../model/path.util';

const COMING: readonly { icon: CodiconRef; title: string; text: string }[] = [
  {
    icon: 'codicon:search-sparkle',
    title: 'Search by description',
    text: '“dog on the beach at sunset”',
  },
  { icon: 'codicon:person', title: 'People and pets', text: 'Faces grouped, on your computer' },
  { icon: 'codicon:history', title: 'Memories', text: 'Trips and years, told for you' },
];

/**
 * The first screen: Gallery shows photos from folders you choose, in place. The Pictures
 * folder is offered when the OS has one.
 */
export function Welcome() {
  const api = useGallery();
  const suggested = api.context.suggestedFolder;

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto p-8">
      <div className="flex max-w-lg flex-col items-center gap-5 text-center">
        <img src={APP.icon} alt="" aria-hidden className="size-16" draggable={false} />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-semibold text-2xl text-fg-strong">Bring your photos into Gallery</h1>
          <p className="text-fg-secondary text-md">
            Choose the folders that hold your photos and videos. Gallery reads them where they are:
            nothing is copied, moved or uploaded, and your library travels with the app.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {suggested === null ? null : (
            <Button
              variant="primary"
              leadingIcon="codicon:folder-library"
              onClick={() => api.addFolderPath(suggested)}
            >
              Add {baseName(suggested)}
            </Button>
          )}
          <Button
            variant={suggested === null ? 'primary' : 'secondary'}
            leadingIcon="codicon:new-folder"
            onClick={api.addFolder}
          >
            Choose a folder…
          </Button>
        </div>
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          {COMING.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-start gap-1 rounded-card border border-border-subtle bg-surface-raised p-3 text-left"
            >
              <span className="flex w-full items-center gap-1.5 text-accent-fg">
                <Icon name={feature.icon} size={14} />
                <Badge tone="accent" size="sm" pill className="ml-auto">
                  Soon
                </Badge>
              </span>
              <span className="font-medium text-fg-strong text-sm">{feature.title}</span>
              <span className="text-fg-muted text-xs">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
