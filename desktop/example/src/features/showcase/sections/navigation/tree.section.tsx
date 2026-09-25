import { Tree, TreeItem } from '@genslate/design-system';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';

function Explorer(props: { indentGuides?: 'always' | 'hover' | 'none' }) {
  const [selected, setSelected] = useState<string | null>('tree');
  return (
    <Tree
      aria-label="Explorer"
      defaultExpanded={['src', 'components', 'navigation']}
      selected={selected}
      onSelect={setSelected}
      indentGuides={props.indentGuides}
      className="w-72"
    >
      <TreeItem id="src" label="src" icon="codicon:folder" expandedIcon="codicon:folder-opened">
        <TreeItem
          id="components"
          label="components"
          icon="codicon:folder"
          expandedIcon="codicon:folder-opened"
        >
          <TreeItem
            id="inputs"
            label="inputs"
            icon="codicon:folder"
            expandedIcon="codicon:folder-opened"
          >
            <TreeItem id="text-field" label="text-field.tsx" icon="codicon:file-code" />
          </TreeItem>
          <TreeItem
            id="navigation"
            label="navigation"
            icon="codicon:folder"
            expandedIcon="codicon:folder-opened"
          >
            <TreeItem id="tabs" label="tabs.tsx" icon="codicon:file-code" trailing="M" />
            <TreeItem id="tree" label="tree.tsx" icon="codicon:file-code" trailing="U" />
          </TreeItem>
        </TreeItem>
        <TreeItem id="index" label="index.ts" icon="codicon:file-code" />
        <TreeItem id="generated" label="generated.ts" icon="codicon:file-code" disabled />
      </TreeItem>
      <TreeItem id="tests" label="tests" icon="codicon:folder" expandedIcon="codicon:folder-opened">
        <TreeItem id="tree-test" label="tree.test.tsx" icon="codicon:file-code" />
      </TreeItem>
      <TreeItem id="package" label="package.json" icon="codicon:bracket-dot" />
      <TreeItem id="readme" label="README.md" icon="codicon:markdown" />
    </Tree>
  );
}

export function TreeSection() {
  return (
    <>
      <Specimen
        title="Explorer tree"
        description="22px rows, rotating chevrons, indent guides on hover. ↑↓ move · → expand · ← collapse · Enter/Space select · type to jump."
        stageClassName="items-start gap-10"
        code={`<Tree aria-label="Explorer" onSelect={open}>\n  <TreeItem id="src" label="src" icon="codicon:folder">\n    <TreeItem id="main" label="main.tsx" />\n  </TreeItem>\n</Tree>`}
      >
        <Explorer />
        <Explorer indentGuides="always" />
      </Specimen>
    </>
  );
}
