import { Tab, Tabs, TabsList, TabsPanel } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

const PANEL = 'px-4 py-6 text-base text-fg-muted';

export function TabsSection() {
  return (
    <>
      <Specimen
        title="Underline"
        description="VS Code panel tabs: quiet labels and a sliding accent bar."
        stageClassName="block p-0"
        code={`<Tabs defaultValue="problems">\n  <TabsList>\n    <Tab value="problems">Problems</Tab>\n  </TabsList>\n  <TabsPanel value="problems">…</TabsPanel>\n</Tabs>`}
      >
        <Tabs defaultValue="problems">
          <TabsList aria-label="Panel" className="px-2">
            <Tab value="problems" icon="codicon:warning">
              Problems
            </Tab>
            <Tab value="output" icon="codicon:output">
              Output
            </Tab>
            <Tab value="debug" icon="codicon:debug-console">
              Debug Console
            </Tab>
            <Tab value="terminal" icon="codicon:terminal">
              Terminal
            </Tab>
            <Tab value="ports" disabled>
              Ports
            </Tab>
          </TabsList>
          <TabsPanel value="problems" className={PANEL}>
            No problems have been detected in the workspace.
          </TabsPanel>
          <TabsPanel value="output" className={PANEL}>
            [info] Build finished in 1.4s.
          </TabsPanel>
          <TabsPanel value="debug" className={PANEL}>
            Debug console is idle.
          </TabsPanel>
          <TabsPanel value="terminal" className={PANEL}>
            zsh — ~/Projects/genslate
          </TabsPanel>
          <TabsPanel value="ports" className={PANEL}>
            No forwarded ports.
          </TabsPanel>
        </Tabs>
      </Specimen>

      <Specimen
        title="Pill"
        description="macOS segmented style with a raised, sliding thumb."
        stageClassName="flex-col items-start gap-6"
      >
        <Tabs variant="pill" defaultValue="general">
          <TabsList aria-label="Settings">
            <Tab value="general">General</Tab>
            <Tab value="appearance">Appearance</Tab>
            <Tab value="accounts">Accounts</Tab>
            <Tab value="advanced">Advanced</Tab>
          </TabsList>
          <TabsPanel value="general" className="text-base text-fg-muted">
            General preferences.
          </TabsPanel>
          <TabsPanel value="appearance" className="text-base text-fg-muted">
            Theme, density and fonts.
          </TabsPanel>
          <TabsPanel value="accounts" className="text-base text-fg-muted">
            Signed-in accounts.
          </TabsPanel>
          <TabsPanel value="advanced" className="text-base text-fg-muted">
            Experimental features.
          </TabsPanel>
        </Tabs>
        <Tabs variant="pill" defaultValue="list">
          <TabsList aria-label="View">
            <Tab value="list" icon="codicon:list-flat">
              List
            </Tab>
            <Tab value="tree" icon="codicon:list-tree">
              Tree
            </Tab>
            <Tab value="disabled" disabled>
              Disabled
            </Tab>
          </TabsList>
        </Tabs>
      </Specimen>

      <Specimen title="States" stageClassName="flex-col items-start gap-4">
        <Tabs defaultValue="a">
          <TabsList aria-label="Underline states">
            <Tab value="a">Active</Tab>
            <Tab value="b" className="text-fg">
              Hover
            </Tab>
            <Tab value="c" className="outline-focus!">
              Focus
            </Tab>
            <Tab value="d" disabled>
              Disabled
            </Tab>
          </TabsList>
        </Tabs>
        <Tabs variant="pill" defaultValue="a">
          <TabsList aria-label="Pill states">
            <Tab value="a">Active</Tab>
            <Tab value="b" className="text-fg-strong">
              Hover
            </Tab>
            <Tab value="c" className="outline-focus!">
              Focus
            </Tab>
            <Tab value="d" disabled>
              Disabled
            </Tab>
          </TabsList>
        </Tabs>
      </Specimen>
    </>
  );
}
