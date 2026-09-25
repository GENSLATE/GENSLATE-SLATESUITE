import { Icon, type CodiconRef } from '@genslate/design-system';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: CodiconRef;
}

/** The top of a showcase page: category, title and one-sentence description. */
export function PageHeader({ eyebrow, title, description, icon }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 pb-6 hairline-b">
      <p className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
        <Icon name={icon} size={14} />
        {eyebrow}
      </p>
      <h1 className="text-2xl font-semibold text-fg-strong">{title}</h1>
      <p className="max-w-[64ch] text-md text-fg-secondary">{description}</p>
    </header>
  );
}
