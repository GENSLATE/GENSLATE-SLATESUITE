import { Slider } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function SliderSection() {
  return (
    <>
      <Specimen
        title="Slider"
        description="A thin track, accent fill and a round shadowed thumb that grows while dragged."
        stageClassName="grid grid-cols-2 items-start gap-x-10 gap-y-8"
        code={`<Slider label="Volume" defaultValue={60} showValue />`}
      >
        <Slider label="Volume" defaultValue={60} showValue />
        <Slider label="Font size" defaultValue={13} min={10} max={20} showValue ticks />
        <Slider
          label="Price range"
          defaultValue={[20, 80]}
          showValue
          getAriaLabel={(index) => (index === 0 ? 'Minimum price' : 'Maximum price')}
        />
        <Slider label="Disabled" defaultValue={35} disabled showValue />
      </Specimen>
      <Specimen title="Focus" stageClassName="block">
        <Slider
          aria-label="Focused"
          defaultValue={50}
          className="[&_[data-slot=slider-thumb]]:outline-focus"
        />
      </Specimen>
    </>
  );
}
