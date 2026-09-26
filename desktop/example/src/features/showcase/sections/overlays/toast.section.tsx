import { Button, useToast } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { ToastStage } from './toast-stage';

function ToastDemo() {
  const toast = useToast();
  return (
    <Specimen
      title="Toast"
      description="Bottom-right, above the status bar. Stacks behind the newest; hover to expand. Swipe or × to dismiss."
      code={`const toast = useToast();\ntoast.add({ title: 'Saved', description: 'main.tsx', type: 'success' });`}
    >
      <Button
        onClick={() =>
          toast.add({
            title: 'Build succeeded',
            description: 'example built in 4.2s.',
            type: 'success',
          })
        }
      >
        Success
      </Button>
      <Button
        onClick={() =>
          toast.add({
            title: 'Update available',
            description: 'Restart to install 0.2.0.',
            type: 'info',
          })
        }
      >
        Info
      </Button>
      <Button
        onClick={() =>
          toast.add({
            title: 'Low disk space',
            description: '2.1 GB left on Macintosh HD.',
            type: 'warning',
          })
        }
      >
        Warning
      </Button>
      <Button
        onClick={() =>
          toast.add({
            title: 'Push failed',
            description: 'The remote rejected the push (non-fast-forward).',
            type: 'error',
            actionProps: { children: 'Pull and retry' },
          })
        }
      >
        Error with action
      </Button>
      <Button variant="ghost" onClick={() => toast.add({ title: 'Copied to clipboard' })}>
        Plain
      </Button>
    </Specimen>
  );
}

export function ToastSection() {
  return (
    <ToastStage>
      <ToastDemo />
    </ToastStage>
  );
}
