import { SegmentedControl, SegmentedControlItem } from '@genslate/design-system';
import { useState } from 'react';
import { Specimen } from '../../components/specimen.component';

export function SegmentedControlSection() {
  const [view, setView] = useState('list');
  return (
    <>
      <Specimen
        title="Segmented control"
        description="One raised thumb slides between equal segments on the spring curve."
        stageClassName="flex-col items-start gap-5"
        code={`<SegmentedControl aria-label="View" value={view} onValueChange={setView}>
  <SegmentedControlItem value="list">List</SegmentedControlItem>
  <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
</SegmentedControl>`}
      >
        <SegmentedControl aria-label="View" value={view} onValueChange={setView}>
          <SegmentedControlItem value="list">List</SegmentedControlItem>
          <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
          <SegmentedControlItem value="columns">Columns</SegmentedControlItem>
          <SegmentedControlItem value="gallery">Gallery</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl aria-label="Layout" defaultValue="grid">
          <SegmentedControlItem value="list" icon="codicon:list-flat" label="List" />
          <SegmentedControlItem value="grid" icon="codicon:table" label="Grid" />
          <SegmentedControlItem value="tree" icon="codicon:list-tree" label="Tree" />
        </SegmentedControl>
      </Specimen>

      <Specimen title="Sizes & states" stageClassName="flex-col items-start gap-4">
        <SegmentedControl aria-label="Small" size="sm" defaultValue="day">
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
          <SegmentedControlItem value="month">Month</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl aria-label="Large" size="lg" defaultValue="week">
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
          <SegmentedControlItem value="month">Month</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl aria-label="With a disabled segment" defaultValue="a">
          <SegmentedControlItem value="a">Enabled</SegmentedControlItem>
          <SegmentedControlItem value="b" disabled>
            Disabled
          </SegmentedControlItem>
          <SegmentedControlItem value="c">Enabled</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl aria-label="Disabled" disabled defaultValue="b">
          <SegmentedControlItem value="a">Off</SegmentedControlItem>
          <SegmentedControlItem value="b">Disabled</SegmentedControlItem>
        </SegmentedControl>
        <div className="w-80">
          <SegmentedControl aria-label="Full width" fullWidth defaultValue="dark">
            <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
            <SegmentedControlItem value="light">Light</SegmentedControlItem>
            <SegmentedControlItem value="auto">Auto</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </Specimen>
    </>
  );
}
