import { Button, EmptyState } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function EmptyStateSection() {
  return (
    <Specimen title="Empty state" stageClassName="grid grid-cols-2 items-stretch gap-6 p-4">
      <div className="inset-ring inset-ring-border-subtle rounded-card">
        <EmptyState
          icon="codicon:search"
          title="No results"
          description="Nothing matches “polar”. Try a shorter query or clear the filters."
          actions={
            <>
              <Button size="sm">Clear filters</Button>
              <Button size="sm" variant="primary">
                New search
              </Button>
            </>
          }
        />
      </div>
      <div className="inset-ring inset-ring-border-subtle flex items-center justify-center rounded-card bg-surface-sidebar">
        <EmptyState
          size="sm"
          icon="codicon:folder-opened"
          title="No folder open"
          description="Open a folder to start."
          actions={
            <Button size="sm" variant="primary">
              Open folder
            </Button>
          }
        />
      </div>
    </Specimen>
  );
}
