import { Breadcrumbs } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

const noop = () => undefined;

export function BreadcrumbsSection() {
  return (
    <Specimen
      title="Breadcrumbs"
      description="The editor path: muted segments, chevron separators, the current file last."
      stageClassName="flex-col items-start gap-5"
      code={`<Breadcrumbs items={[{ id: 'src', label: 'src', onSelect }, { id: 'file', label: 'main.tsx' }]} />`}
    >
      <Breadcrumbs
        items={[
          { id: 'root', label: 'genslate', icon: 'codicon:root-folder', onSelect: noop },
          { id: 'packages', label: 'packages', onSelect: noop },
          { id: 'ds', label: 'design-system', onSelect: noop },
          { id: 'file', label: 'tree.component.tsx', icon: 'codicon:file-code' },
        ]}
      />
      <Breadcrumbs
        size="md"
        items={[
          { id: 'settings', label: 'Settings', icon: 'codicon:settings-gear', onSelect: noop },
          { id: 'editor', label: 'Text Editor', onSelect: noop },
          { id: 'font', label: 'Font' },
        ]}
      />
    </Specimen>
  );
}
