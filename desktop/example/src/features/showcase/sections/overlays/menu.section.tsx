import { Button, Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { EditorMenuItems } from './menu-demo';

export function MenuSection() {
  return (
    <>
      <Specimen
        title="Menu"
        description="24px rows, accent highlight like native macOS menus, shortcuts right-aligned, checkmarks in a leading column."
        stageClassName="gap-4 pb-10"
        code={`<Menu>\n  <MenuTrigger render={<Button />}>File</MenuTrigger>\n  <MenuPopup>\n    <MenuItem icon="codicon:new-file" shortcut="mod+n">New File</MenuItem>\n  </MenuPopup>\n</Menu>`}
      >
        <Menu>
          <MenuTrigger render={<Button trailingIcon="codicon:chevron-down" />}>File</MenuTrigger>
          <MenuPopup>
            <EditorMenuItems />
          </MenuPopup>
        </Menu>
        <Menu>
          <MenuTrigger render={<Button variant="ghost" trailingIcon="codicon:chevron-down" />}>Edit</MenuTrigger>
          <MenuPopup glass>
            <MenuItem icon="codicon:discard" shortcut="mod+z">
              Undo
            </MenuItem>
            <MenuItem icon="codicon:redo" shortcut="mod+shift+z">
              Redo
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon="codicon:copy" shortcut="mod+c">
              Copy
            </MenuItem>
            <MenuItem icon="codicon:clippy" shortcut="mod+v">
              Paste
            </MenuItem>
            <MenuItem icon="codicon:link" shortcut="mod+alt+c" disabled>
              Copy Link
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon="codicon:trash" tone="danger">
              Delete
            </MenuItem>
          </MenuPopup>
        </Menu>
      </Specimen>
    </>
  );
}
