import { Textarea } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function TextareaSection() {
  return (
    <>
      <Specimen
        title="Textarea"
        description="Multi-line text with the same field chrome; optionally grows with its content."
        stageClassName="grid grid-cols-2 items-start gap-6"
        code={`<Textarea label="Commit message" autoGrow minRows={2} maxRows={8} />`}
      >
        <Textarea
          label="Commit message"
          description="Grows up to eight lines."
          autoGrow
          minRows={2}
          maxRows={8}
          defaultValue={
            'feat(design-system): add tree view\n\nKeyboard support per the APG pattern.'
          }
        />
        <Textarea
          label="Release notes"
          placeholder="What changed?"
          error="Release notes are required."
        />
      </Specimen>
      <Specimen title="States" stageClassName="grid grid-cols-3 items-start gap-4">
        <Textarea aria-label="Rest" placeholder="Rest" minRows={3} />
        <Textarea aria-label="Disabled" defaultValue="Disabled" disabled minRows={3} />
        <Textarea aria-label="Small" size="sm" defaultValue="Small size" minRows={3} />
      </Specimen>
    </>
  );
}
