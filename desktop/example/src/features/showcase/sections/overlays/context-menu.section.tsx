import { ContextMenu, ContextMenuPopup, ContextMenuTrigger } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { EditorMenuItems } from './menu-demo';

export function ContextMenuSection() {
  return (
    <Specimen
      title="Context menu"
      description="Right-click (or long-press) the area. Rows are the same Menu parts."
      stageClassName="block"
      code={`<ContextMenu>\n  <ContextMenuTrigger>…</ContextMenuTrigger>\n  <ContextMenuPopup>\n    <ContextMenuItem>Rename</ContextMenuItem>\n  </ContextMenuPopup>\n</ContextMenu>`}
    >
      <ContextMenu>
        <ContextMenuTrigger className="flex h-48 items-center justify-center rounded-card border border-border border-dashed text-base text-fg-muted">
          Right-click anywhere in this area
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <EditorMenuItems />
        </ContextMenuPopup>
      </ContextMenu>
    </Specimen>
  );
}
