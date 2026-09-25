import {
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
} from '@genslate/design-system';

/** Shared rows for the Menu and Context Menu pages. */
export function EditorMenuItems() {
  return (
    <>
      <MenuItem inset shortcut="mod+n">
        New File
      </MenuItem>
      <MenuItem inset shortcut="mod+o">
        Open Folder…
      </MenuItem>
      <MenuSubmenuRoot>
        <MenuSubmenuTrigger inset>Open Recent</MenuSubmenuTrigger>
        <MenuPopup>
          <MenuItem>genslate</MenuItem>
          <MenuItem>nord-theme</MenuItem>
          <MenuItem>tauri-playground</MenuItem>
          <MenuSeparator />
          <MenuItem>Clear Recently Opened</MenuItem>
        </MenuPopup>
      </MenuSubmenuRoot>
      <MenuSeparator />
      <MenuItem inset shortcut="mod+s">
        Save
      </MenuItem>
      <MenuItem inset shortcut="mod+shift+s">
        Save As…
      </MenuItem>
      <MenuItem inset disabled>
        Revert File
      </MenuItem>
      <MenuSeparator />
      <MenuCheckboxItem defaultChecked shortcut="alt+z">
        Word Wrap
      </MenuCheckboxItem>
      <MenuCheckboxItem>Minimap</MenuCheckboxItem>
      <MenuSeparator />
      <MenuGroup>
        <MenuRadioGroup defaultValue="spaces">
          <MenuGroupLabel inset>Indentation</MenuGroupLabel>
          <MenuRadioItem value="spaces">Spaces</MenuRadioItem>
          <MenuRadioItem value="tabs">Tabs</MenuRadioItem>
        </MenuRadioGroup>
      </MenuGroup>
      <MenuSeparator />
      <MenuItem inset tone="danger" shortcut="mod+backspace">
        Delete File
      </MenuItem>
    </>
  );
}
