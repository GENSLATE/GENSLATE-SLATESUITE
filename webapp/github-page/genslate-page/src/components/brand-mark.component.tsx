import { cn } from '@genslate/design-system';

/**
 * The GENSLATE mark: three Frost slates (other/resources/branding/app-icon.svg without the
 * plate). Inside a `.mark` link the slates lift apart on hover (see site.motion.css).
 */
export function BrandMark({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="262 243 500 538"
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible', className)}
    >
      <g className="mark-slate mark-slate-bottom">
        <path d="M282 595 L512 727 L512 761 L282 629 Z" fill="#4c6a8f" />
        <path d="M512 727 L742 595 L742 629 L512 761 Z" fill="#3e5878" />
        <path d="M512 463 L742 595 L512 727 L282 595 Z" fill="#5e81ac" />
      </g>
      <g className="mark-slate">
        <path d="M282 495 L512 627 L512 661 L282 529 Z" fill="#6983a0" />
        <path d="M512 627 L742 495 L742 529 L512 661 Z" fill="#566d88" />
        <path d="M512 363 L742 495 L512 627 L282 495 Z" fill="#81a1c1" />
      </g>
      <g className="mark-slate mark-slate-top">
        <path d="M282 395 L512 527 L512 561 L282 429 Z" fill="#6c9ba9" />
        <path d="M512 527 L742 395 L742 429 L512 561 Z" fill="#5a8390" />
        <path d="M512 263 L742 395 L512 527 L282 395 Z" fill="#88c0d0" />
      </g>
    </svg>
  );
}
