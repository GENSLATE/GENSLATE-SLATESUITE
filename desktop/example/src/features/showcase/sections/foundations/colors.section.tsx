import { ColorSwatch, useTheme } from '@genslate/design-system';
import { CHROME_COLOR_KEYS, SEMANTIC_COLOR_KEYS } from '@genslate/tokens';
import { NORD_HEX, THEME_COLORS } from '@genslate/tokens/generated';
import { Specimen } from '../../components/specimen.component';

type SemanticKey = (typeof SEMANTIC_COLOR_KEYS)[number];
type ChromeKey = (typeof CHROME_COLOR_KEYS)[number];

const NORD_GROUPS = [
  { title: 'Polar Night', description: 'nord0–nord3 · dark surfaces', keys: [0, 1, 2, 3] },
  { title: 'Snow Storm', description: 'nord4–nord6 · light surfaces and text', keys: [4, 5, 6] },
  { title: 'Frost', description: 'nord7–nord10 · accents and focus', keys: [7, 8, 9, 10] },
  { title: 'Aurora', description: 'nord11–nord15 · status only', keys: [11, 12, 13, 14, 15] },
] as const;

const SEMANTIC_GROUPS: readonly { title: string; match: (key: SemanticKey) => boolean }[] = [
  {
    title: 'Surfaces',
    match: (key) =>
      key === 'canvas' || key.startsWith('surface') || key === 'field' || key === 'scrim',
  },
  { title: 'Borders', match: (key) => key.startsWith('border') },
  { title: 'Text', match: (key) => key.startsWith('fg') || key.startsWith('on-') },
  { title: 'Accent & focus', match: (key) => key.startsWith('accent') || key.startsWith('focus') },
  {
    title: 'Selection, fills & controls',
    match: (key) =>
      key.startsWith('selection') ||
      key.startsWith('fill') ||
      key.startsWith('control') ||
      key === 'track' ||
      key === 'thumb',
  },
  {
    title: 'Status',
    match: (key) => /^(danger|warning|success|info)/.test(key),
  },
];

const CHROME_GROUPS: readonly { title: string; prefix: readonly string[] }[] = [
  { title: 'Titlebar & command center', prefix: ['titlebar', 'command-center'] },
  { title: 'Status bar', prefix: ['statusbar'] },
  { title: 'Tabs & tooltips', prefix: ['tab', 'tooltip'] },
  { title: 'Traffic lights', prefix: ['traffic'] },
  { title: 'Scrollbars', prefix: ['scrollbar'] },
];

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-5';

export function ColorsSection() {
  const { resolvedTheme } = useTheme();
  const resolved = THEME_COLORS[resolvedTheme] as Readonly<Record<string, string>>;

  return (
    <>
      {NORD_GROUPS.map((group) => (
        <Specimen
          key={group.title}
          title={group.title}
          description={group.description}
          stageClassName={GRID}
        >
          {group.keys.map((index) => {
            const key = `nord-${index}` as keyof typeof NORD_HEX;
            return (
              <ColorSwatch
                key={key}
                color={NORD_HEX[key]}
                name={`nord${index}`}
                value={NORD_HEX[key]}
              />
            );
          })}
        </Specimen>
      ))}

      {SEMANTIC_GROUPS.map((group) => (
        <Specimen
          key={group.title}
          title={group.title}
          description="Semantic roles — utilities like bg-{role}, text-{role}, border-{role}."
          stageClassName={GRID}
        >
          {SEMANTIC_COLOR_KEYS.filter(group.match).map((key) => (
            <ColorSwatch
              key={key}
              color={`var(--gs-color-${key})`}
              name={key}
              value={resolved[key]}
            />
          ))}
        </Specimen>
      ))}

      {CHROME_GROUPS.map((group) => (
        <Specimen
          key={group.title}
          title={group.title}
          description="Window chrome roles."
          stageClassName={GRID}
        >
          {CHROME_COLOR_KEYS.filter((key: ChromeKey) =>
            group.prefix.some((prefix) => key.startsWith(prefix)),
          ).map((key) => (
            <ColorSwatch key={key} color={`var(--gs-${key})`} name={key} value={resolved[key]} />
          ))}
        </Specimen>
      ))}
    </>
  );
}
