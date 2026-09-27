import { cn } from '@genslate/design-system';
import { useEffect, useState } from 'react';

import type { DocHeading } from '../../content/content.types';

/** "On this page": the h2/h3 outline, highlighting the section being read (scroll-spy). */
export function DocOutline({ headings }: { readonly headings: readonly DocHeading[] }) {
  const [active, setActive] = useState(headings[0]?.id);

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = targets.find((target) => visible.has(target.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-72px 0px -62% 0px' },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 font-semibold text-2xs text-fg-muted uppercase tracking-[0.08em]">
        On this page
      </p>
      <ul className="grid gap-0.5 border-border-subtle border-l">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={heading.id === active ? 'location' : undefined}
              className={cn(
                '-ml-px block border-transparent border-l py-1 text-fg-muted leading-snug transition-colors duration-fast hover:text-fg-strong hover:no-underline',
                heading.level === 3 ? 'pl-6' : 'pl-3',
                'aria-[current]:border-accent aria-[current]:text-accent-fg',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
