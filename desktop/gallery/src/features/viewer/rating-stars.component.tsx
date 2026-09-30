import { cn, Icon } from '@genslate/design-system';

interface RatingStarsProps {
  readonly rating: number;
  readonly onRate: (rating: number) => void;
  readonly disabled?: boolean;
  readonly size?: 12 | 14;
}

/** Five stars as a radio group: click a star to rate, click the current one to clear. */
export function RatingStars({ rating, onRate, disabled = false, size = 14 }: RatingStarsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      data-slot="rating-stars"
      className="flex items-center"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        // biome-ignore lint/a11y/useSemanticElements: star buttons in an APG radio group (native radios can't show stars)
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={rating === star}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          disabled={disabled}
          onClick={() => onRate(rating === star ? 0 : star)}
          className={cn(
            'focus-ring grid size-6 cursor-interactive place-items-center rounded-sm disabled:cursor-not-allowed',
            star <= rating ? 'text-warning-fg' : 'text-fg-disabled hover:text-fg-muted',
          )}
        >
          <Icon name={star <= rating ? 'codicon:star-full' : 'codicon:star-empty'} size={size} />
        </button>
      ))}
    </div>
  );
}
