import { Badge, type BadgeTone } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';
import { StateMatrix } from '../../components/state-matrix.component';

const TONES: readonly BadgeTone[] = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'];
const title = (tone: string) => tone[0]?.toUpperCase() + tone.slice(1);

export function BadgeSection() {
  return (
    <>
      <StateMatrix
        caption="Badge tones and variants"
        columns={['Subtle', 'Solid', 'Outline', 'Dot', 'Icon', 'Count']}
        rows={TONES.map((tone) => ({
          label: title(tone),
          cells: [
            <Badge key="subtle" tone={tone}>
              {title(tone)}
            </Badge>,
            <Badge key="solid" tone={tone} variant="solid">
              {title(tone)}
            </Badge>,
            <Badge key="outline" tone={tone} variant="outline">
              {title(tone)}
            </Badge>,
            <Badge key="dot" tone={tone} dot>
              {title(tone)}
            </Badge>,
            <Badge key="icon" tone={tone} icon="codicon:check">
              {title(tone)}
            </Badge>,
            <Badge key="count" tone={tone} variant="solid" pill>
              {12}
            </Badge>,
          ],
        }))}
      />
      <Specimen title="Sizes" description="md 20px for labels, sm 16px inside dense rows.">
        <Badge>Medium</Badge>
        <Badge size="sm">Small</Badge>
        <Badge size="sm" pill variant="solid" tone="accent">
          3
        </Badge>
        <Badge size="sm" tone="success" dot>
          Online
        </Badge>
      </Specimen>
    </>
  );
}
