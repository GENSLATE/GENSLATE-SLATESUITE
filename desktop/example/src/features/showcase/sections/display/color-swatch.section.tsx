import { ColorSwatch } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function ColorSwatchSection() {
  return (
    <>
      <Specimen title="Tile" stageClassName="grid grid-cols-4 gap-4">
        <ColorSwatch color="var(--gs-color-accent)" name="accent" value="bg-accent" />
        <ColorSwatch color="var(--gs-color-selection)" name="selection" value="translucent" />
        <ColorSwatch color="var(--gs-color-success)" name="success" value="bg-success" />
        <ColorSwatch color="var(--gs-color-canvas)" name="canvas" value="bg-canvas" />
      </Specimen>
      <Specimen title="Row" stageClassName="grid grid-cols-3 gap-4">
        <ColorSwatch layout="row" color="var(--gs-color-danger)" name="danger" value="#bf616a" />
        <ColorSwatch layout="row" color="var(--gs-color-warning)" name="warning" value="#ebcb8b" />
        <ColorSwatch layout="row" color="var(--gs-color-info)" name="info" value="#81a1c1" />
      </Specimen>
    </>
  );
}
