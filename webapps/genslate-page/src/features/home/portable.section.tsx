import { type CodiconRef, Icon, Tree, TreeItem } from '@genslate/design-system';
import type { CSSProperties } from 'react';

import { useRouter } from '../../app/router/router.context';
import { LinkButton } from '../../components/link-button.component';
import { Section, SectionHeading } from '../../components/section.component';

const PILLARS: readonly { icon: CodiconRef; title: string; body: string }[] = [
  {
    icon: 'codicon:package',
    title: 'Unzip and run',
    body: 'No installer, no admin rights, no registry. Each app — or the whole suite — is a folder.',
  },
  {
    icon: 'codicon:database',
    title: 'Lives on your drive',
    body: 'Settings, caches, logs and your files stay beside the apps, so a USB stick carries everything.',
  },
  {
    icon: 'codicon:settings',
    title: 'Plain-text settings',
    body: 'Every option is a commented TOML file you can edit, diff and back up. Saved changes apply instantly.',
  },
];

const Hint = ({ children }: { readonly children: string }) => (
  <span className="text-fg-muted text-xs">{children}</span>
);

/** Why portability matters, with the suite folder as a live, keyboard-navigable tree. */
export function PortableSection() {
  const { href } = useRouter();
  return (
    <Section
      labelledBy="portable-title"
      className="grid items-center gap-16 lg:grid-cols-[1fr_1.05fr]"
    >
      <div>
        <SectionHeading
          id="portable-title"
          eyebrow="Portable by design"
          title="Your whole desktop, in one folder."
          lead="GENSLATE apps never scatter files across the computer they run on. Plug in your drive, open the Launcher, and your apps, settings and documents are exactly where you left them."
        />
        <ul className="mt-10 grid gap-6">
          {PILLARS.map((pillar, index) => (
            <li
              key={pillar.title}
              className="reveal flex gap-4"
              style={{ '--reveal-step': index } as CSSProperties}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-subtle text-accent-fg">
                <Icon name={pillar.icon} size={20} />
              </span>
              <span>
                <span className="block font-semibold text-fg-strong text-lg">{pillar.title}</span>
                <span className="mt-1 block text-fg-secondary text-md leading-relaxed">
                  {pillar.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="reveal mt-10">
          <LinkButton href={href('/docs/portable-mode/')} trailingIcon="codicon:arrow-right">
            How portable mode works
          </LinkButton>
        </div>
      </div>

      <div className="reveal overflow-hidden rounded-window border border-border-subtle bg-surface-sidebar shadow-dialog">
        <div className="hairline-b flex h-10 items-center gap-2 px-4">
          <span className="flex gap-2" aria-hidden="true">
            <span className="size-3 rounded-full bg-traffic-close" />
            <span className="size-3 rounded-full bg-traffic-minimize" />
            <span className="size-3 rounded-full bg-traffic-maximize" />
          </span>
          <span className="mx-auto flex items-center gap-2 text-fg-muted text-sm">
            <Icon name="codicon:database" size={14} /> GENSLATE-USB
          </span>
        </div>
        <div className="p-3">
          <Tree
            aria-label="The GENSLATE suite folder"
            defaultExpanded={['programs', 'genslate', 'other', 'config', 'storage', 'shared']}
            defaultSelected="launcher"
            indentGuides="always"
          >
            <TreeItem
              id="programs"
              label="programs"
              icon="codicon:folder"
              expandedIcon="codicon:folder-opened"
            >
              <TreeItem
                id="genslate"
                label="genslate"
                icon="codicon:folder"
                expandedIcon="codicon:folder-opened"
                trailing={<Hint>GENSLATE apps</Hint>}
              >
                <TreeItem
                  id="launcher"
                  label="launcher"
                  icon="codicon:rocket"
                  trailing={<Hint>the start menu</Hint>}
                />
                <TreeItem id="terminal" label="terminal" icon="codicon:terminal" />
                <TreeItem id="explorer" label="explorer" icon="codicon:files" />
              </TreeItem>
              <TreeItem
                id="portableapps"
                label="portableapps.com"
                icon="codicon:folder"
                trailing={<Hint>your PortableApps</Hint>}
              />
              <TreeItem
                id="portapps"
                label="portapps.io"
                icon="codicon:folder"
                trailing={<Hint>your portapps</Hint>}
              />
            </TreeItem>
            <TreeItem
              id="other"
              label="other"
              icon="codicon:folder"
              expandedIcon="codicon:folder-opened"
            >
              <TreeItem
                id="config"
                label="config"
                icon="codicon:folder"
                expandedIcon="codicon:folder-opened"
              >
                <TreeItem
                  id="config-launcher"
                  label="slatesuite/apps/launcher.config.toml"
                  icon="codicon:settings-gear"
                  trailing={<Hint>hot-reloaded</Hint>}
                />
                <TreeItem
                  id="keys"
                  label="slatesuite/apps/launcher.keybindings.toml"
                  icon="codicon:record-keys"
                />
              </TreeItem>
              <TreeItem id="logs" label="logs" icon="codicon:output" />
              <TreeItem
                id="cache"
                label="cache"
                icon="codicon:trash"
                trailing={<Hint>safe to delete</Hint>}
              />
            </TreeItem>
            <TreeItem
              id="storage"
              label="storage"
              icon="codicon:folder"
              expandedIcon="codicon:folder-opened"
            >
              <TreeItem
                id="shared"
                label="users/shared"
                icon="codicon:folder"
                expandedIcon="codicon:folder-opened"
                trailing={<Hint>your files</Hint>}
              >
                <TreeItem id="desktop" label="Desktop" icon="codicon:vm" />
                <TreeItem id="documents" label="Documents" icon="codicon:file-text" />
                <TreeItem id="pictures" label="Pictures" icon="codicon:file-media" />
              </TreeItem>
            </TreeItem>
          </Tree>
        </div>
      </div>
    </Section>
  );
}
