import { type CodiconRef, Icon } from '@genslate/design-system';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: CodiconRef;
}

/** The top of a showcase page: category, title and one-sentence description. */
export function PageHeader({ eyebrow, title, description, icon }: PageHeaderProps) {
  return (
    <div className="hairline-b flex flex-col gap-2 pb-6">
      <p className="flex items-center gap-1.5 font-medium text-fg-muted text-xs">
        <Icon name={icon} size={14} />
        {eyebrow}
      </p>
      <h1 className="font-semibold text-2xl text-fg-strong">{title}</h1>
      <p className="max-w-[64ch] text-fg-secondary text-md">{description}</p>
    </div>
  );
}
