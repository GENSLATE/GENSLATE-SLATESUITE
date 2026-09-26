import { cn } from '../../../utils/cn.util';
import type { CardBodyProps, CardFooterProps, CardHeaderProps, CardProps } from './card.types';
import { cardVariants } from './card.variants';

/** A grouped block of content. Flat with a hairline at rest; `raised` only when it floats. */
export function Card({
  variant = 'outline',
  padding = 'md',
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, padding, interactive }).root(), className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: CardHeaderProps) {
  const styles = cardVariants();
  return (
    <div data-slot="card-header" className={cn(styles.header(), className)} {...props}>
      <div className={styles.headerText()}>
        {title != null && <h3 className={styles.title()}>{title}</h3>}
        {description != null && <p className={styles.description()}>{description}</p>}
        {children}
      </div>
      {actions != null && <div className={styles.actions()}>{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: CardBodyProps) {
  return <div data-slot="card-body" className={cn(cardVariants().body(), className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div data-slot="card-footer" className={cn(cardVariants().footer(), className)} {...props} />
  );
}
