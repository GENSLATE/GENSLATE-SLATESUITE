import { Button, type ButtonVariant, type CodiconRef, cn } from '@genslate/design-system';
import type { ReactNode } from 'react';

export interface LinkButtonProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  /** `lg` is the marketing size (40px); `md` matches the apps. */
  readonly size?: 'md' | 'lg';
  readonly leadingIcon?: CodiconRef;
  readonly trailingIcon?: CodiconRef;
  /** Opens in a new tab (external links). */
  readonly external?: boolean;
  readonly className?: string;
}

/** A design-system `Button` rendered as a link. */
export function LinkButton({
  href,
  children,
  variant = 'secondary',
  size = 'lg',
  leadingIcon,
  trailingIcon,
  external = false,
  className,
}: LinkButtonProps) {
  return (
    <Button
      variant={variant}
      size="lg"
      nativeButton={false}
      leadingIcon={leadingIcon}
      trailingIcon={trailingIcon}
      className={cn(
        'hover:no-underline',
        size === 'lg' && 'h-10 rounded-lg px-4.5 text-md',
        className,
      )}
      render={
        <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />
      }
    >
      {children}
    </Button>
  );
}
