import { SearchField } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const FOCUS = 'border-accent shadow-[0_0_0_3px_var(--gs-color-focus-halo)]';

export function SearchFieldSection() {
  return (
    <>
      <Specimen
        title="Search"
        description="Magnifier, clear button, Escape clears, and a shortcut hint while empty."
        stageClassName="grid grid-cols-2 gap-6"
        code={`<SearchField placeholder="Search files" shortcut="mod+p" />`}
      >
        <SearchField placeholder="Search files" shortcut="mod+p" />
        <SearchField label="Filter settings" defaultValue="font size" />
      </Specimen>
      <StateMatrix
        caption="Search field states"
        columns={['Rest', 'Focus', 'Filled', 'Disabled']}
        rows={(['sm', 'md', 'lg'] as const).map((size) => ({
          label: size.toUpperCase(),
          cells: [
            <SearchField className="w-36" key="rest" size={size} shortcut="mod+f" />,
            <SearchField className="w-36" key="focus" size={size} controlClassName={FOCUS} />,
            <SearchField className="w-36" key="filled" size={size} defaultValue="tokens" />,
            <SearchField className="w-36" key="disabled" size={size} disabled />,
          ],
        }))}
      />
    </>
  );
}
