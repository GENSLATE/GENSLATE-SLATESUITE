import {
  ToggleButton,
  ToggleGroup,
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarTextButton,
} from '@genslate/design-system';
import { DemoWindow } from '../../components/demo-window.component';
import { Specimen } from '../../components/specimen.component';

export function ToolbarSection() {
  return (
    <Specimen
      title="Toolbar"
      description="One tab stop, arrow keys between items (Base UI Toolbar). Groups are separated by hairlines."
      stageClassName="bg-surface-sunken p-8"
    >
      <DemoWindow label="Editor toolbar">
        <Toolbar aria-label="Editor" variant="bar">
          <ToolbarGroup aria-label="History">
            <ToolbarButton icon="codicon:discard" label="Undo" />
            <ToolbarButton icon="codicon:redo" label="Redo" />
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToggleGroup aria-label="Formatting" multiple defaultValue={['bold']}>
            <ToggleButton value="bold" icon="codicon:bold" label="Bold" />
            <ToggleButton value="italic" icon="codicon:italic" label="Italic" />
          </ToggleGroup>
          <ToolbarSeparator />
          <ToolbarGroup aria-label="Insert">
            <ToolbarButton icon="codicon:link" label="Insert link" />
            <ToolbarButton icon="codicon:file-media" label="Insert image" />
            <ToolbarButton icon="codicon:table" label="Insert table" disabled />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarTextButton leadingIcon="codicon:play">Run</ToolbarTextButton>
          <ToolbarTextButton variant="primary">Share</ToolbarTextButton>
        </Toolbar>
        <div className="h-24 bg-canvas" />
      </DemoWindow>
    </Specimen>
  );
}
