import { TrafficLights, WindowControls } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const SHOW_GLYPHS = '[&_svg]:opacity-100';
const PRESSED =
  '[&_svg]:opacity-100 [&>button:nth-child(1)]:bg-traffic-close-pressed [&>button:nth-child(2)]:bg-traffic-minimize-pressed [&>button:nth-child(3)]:bg-traffic-maximize-pressed';

export function TrafficLightsSection() {
  return (
    <>
      <Specimen
        title="Traffic lights"
        description="12px lights, 8px apart, a 0.5px rim. Glyphs appear while the pointer is over the group."
        stageClassName="gap-10 p-10"
      >
        <TrafficLights style={{ zoom: 2 }} />
        <TrafficLights style={{ zoom: 2 }} className={SHOW_GLYPHS} />
        <TrafficLights style={{ zoom: 2 }} isFullscreen className={SHOW_GLYPHS} />
      </Specimen>

      <StateMatrix
        caption="Traffic light states"
        columns={['Rest', 'Hover', 'Pressed', 'Inactive window', 'Full screen', 'Disabled']}
        rows={[
          {
            label: 'Lights',
            cells: [
              <TrafficLights key="rest" />,
              <TrafficLights key="hover" className={SHOW_GLYPHS} />,
              <TrafficLights key="pressed" className={PRESSED} />,
              <TrafficLights key="inactive" isFocused={false} />,
              <TrafficLights key="fullscreen" isFullscreen className={SHOW_GLYPHS} />,
              <TrafficLights key="disabled" disabled={{ minimize: true, maximize: true }} />,
            ],
          },
        ]}
      />

      <Specimen
        title="Windows caption buttons"
        description="46px wide, full titlebar height; close turns red on hover."
        stageClassName="flex-col items-stretch gap-px bg-border-subtle p-0"
      >
        <div className="flex h-titlebar w-full items-stretch justify-end bg-titlebar-bg">
          <WindowControls />
        </div>
        <div className="flex h-titlebar w-full items-stretch justify-end bg-titlebar-bg">
          <WindowControls isMaximized />
        </div>
      </Specimen>
    </>
  );
}
