import { cn } from '../../../utils/cn.util';
import { renderIconSlot } from '../../display/icon/icon.slot';
import { Badge } from '../badge/badge.component';
import type { FeatureTeaserProps, FeatureTeaserSampleProps } from './feature-teaser.types';
import { featureTeaserVariants } from './feature-teaser.variants';

const styles = featureTeaserVariants();

/**
 * The top of a preview of a feature still to come: its glyph, name and a "Coming soon" badge,
 * then what it will do. Apps show it in side panels and popovers for AI features that aren't
 * built yet, so every app teases them the same way.
 */
export function FeatureTeaser({
  icon,
  title,
  level = 2,
  labels,
  className,
  children,
  ...props
}: FeatureTeaserProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <div data-slot="feature-teaser" className={cn(styles.root(), className)} {...props}>
      <div className={styles.header()}>
        <span data-slot="feature-teaser-icon" aria-hidden className={styles.icon()}>
          {renderIconSlot(icon, 16)}
        </span>
        <Heading data-slot="feature-teaser-title" className={styles.title()}>
          {title}
        </Heading>
        <Badge tone="accent" size="sm" pill className={styles.badge()}>
          {labels?.soon ?? 'Coming soon'}
        </Badge>
      </div>
      <p data-slot="feature-teaser-description" className={styles.description()}>
        {children}
      </p>
    </div>
  );
}

/** A faded, inert sample of what the feature will show. Hidden from assistive tech. */
export function FeatureTeaserSample({
  label,
  className,
  children,
  ...props
}: FeatureTeaserSampleProps) {
  return (
    <div data-slot="feature-teaser-sample" className={cn(styles.sample(), className)} {...props}>
      <p className={styles.sampleLabel()}>{label}</p>
      <div data-slot="feature-teaser-sample-body" aria-hidden inert className={styles.sampleBody()}>
        {children}
      </div>
    </div>
  );
}
