import {
  Badge,
  Button,
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { EditorMenuItems } from './menu-demo';

export function MenuSection() {
  return (
    <Specimen
      title="Menu"
      description="24px rows, accent highlight like native macOS menus, shortcuts right-aligned, checkmarks in a leading column. MenuHeader adds an identity row (tray and account menus); media puts an app icon in the icon slot."
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
        <MenuTrigger render={<Button variant="ghost" trailingIcon="codicon:chevron-down" />}>
          Edit
        </MenuTrigger>
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
      <Menu>
        <MenuTrigger render={<Button variant="ghost" trailingIcon="codicon:chevron-down" />}>
          Account
        </MenuTrigger>
        <MenuPopup className="w-64">
          <MenuHeader
            media={<AppMark letter="G" />}
            title="GENSLATE"
            description="Header: mark, title, one muted line"
            accessory={<Badge tone="neutral">v1.0</Badge>}
          />
          <MenuSeparator />
          <MenuItem media={<AppMark letter="E" />}>Editor</MenuItem>
          <MenuItem media={<AppMark letter="T" />}>Terminal</MenuItem>
          <MenuItem media={<AppMark letter="J" />} disabled>
            Jukebox (not installed)
          </MenuItem>
        </MenuPopup>
      </Menu>
    </Specimen>
  );
}

/** A stand-in app icon for the `media` slot (apps pass their real icon image). */
function AppMark({ letter }: { letter: string }) {
  return (
    <span className="grid place-items-center rounded-sm bg-accent-subtle font-semibold text-2xs text-accent-fg">
      {letter}
    </span>
  );
}
