import { Avatar } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

const PEOPLE = ['Arctic Ice', 'Polar Night', 'Snow Storm', 'Frost', 'Aurora Borealis'] as const;

export function AvatarSection() {
  return (
    <>
      <Specimen
        title="Sizes"
        description="16 · 20 · 24 · 32 · 40 — initials when there is no image."
      >
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
          <Avatar key={size} size={size} name="Arctic Ice" />
        ))}
      </Specimen>
      <Specimen title="Presence & shape">
        <Avatar size="lg" name="Polar Night" status="online" />
        <Avatar size="lg" name="Snow Storm" status="away" />
        <Avatar size="lg" name="Frost" status="busy" />
        <Avatar size="lg" name="Aurora" status="offline" />
        <Avatar size="lg" shape="square" name="GENSLATE Org" />
        <Avatar size="lg" />
      </Specimen>
      <Specimen title="Stack">
        <div className="flex -space-x-2">
          {PEOPLE.map((name) => (
            <Avatar key={name} size="lg" name={name} className="rounded-full ring-2 ring-canvas" />
          ))}
        </div>
      </Specimen>
    </>
  );
}
