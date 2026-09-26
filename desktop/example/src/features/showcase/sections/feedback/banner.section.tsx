import { Banner, Button } from '@genslate/design-system';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';

export function BannerSection() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <Specimen title="Inline" stageClassName="flex-col items-stretch gap-3">
        <Banner tone="info" title="A new version is available">
          GENSLATE 0.2 brings the command palette and toasts.
        </Banner>
        <Banner tone="success" title="Settings synced" />
        <Banner
          tone="warning"
          title="Unsaved changes"
          actions={
            <Button size="sm" variant="secondary">
              Review
            </Button>
          }
        >
          Two files have changes that aren’t saved yet.
        </Banner>
        <Banner tone="danger" title="Build failed">
          <code className="text-danger-fg">tsc</code> exited with 2 errors.
        </Banner>
        <Banner tone="neutral">Tip: press ⌘K to search everything.</Banner>
        {visible ? (
          <Banner tone="info" onDismiss={() => setVisible(false)}>
            Dismissible banner — click the × to hide it.
          </Banner>
        ) : (
          <Button size="sm" className="self-start" onClick={() => setVisible(true)}>
            Show the dismissible banner again
          </Button>
        )}
      </Specimen>
      <Specimen
        title="Bar"
        description="Full-width strip under a toolbar or titlebar."
        stageClassName="flex-col items-stretch gap-0 p-0"
      >
        <Banner variant="bar" tone="warning" actions={<Button size="xs">Reload</Button>}>
          The workspace changed on disk.
        </Banner>
        <div className="h-16" />
      </Specimen>
    </>
  );
}
