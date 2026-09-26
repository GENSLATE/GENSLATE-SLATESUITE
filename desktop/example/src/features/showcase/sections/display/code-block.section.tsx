import { CodeBlock } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

const SAMPLE = `import { DesignSystemProvider, Button } from '@genslate/design-system';

export function App() {
  return (
    <DesignSystemProvider defaultTheme="system">
      <Button variant="primary">Hello, Nord</Button>
    </DesignSystemProvider>
  );
}
`;

export function CodeBlockSection() {
  return (
    <Specimen
      title="Code block"
      description="Monospaced, sunken, copyable. No highlighting library."
      bare
    >
      <div className="grid grid-cols-1 gap-4">
        <CodeBlock title="app.tsx" language="tsx" code={SAMPLE} lineNumbers />
        <CodeBlock code="bun install && bun run dev" />
      </div>
    </Specimen>
  );
}
