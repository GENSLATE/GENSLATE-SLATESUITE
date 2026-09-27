import { Icon } from '@genslate/design-system';

import { useRouter } from '../../app/router/router.context';
import { LinkButton } from '../../components/link-button.component';

/** 404 — also served by GitHub Pages for any unknown path (404.html). */
export function NotFoundPage() {
  const { href } = useRouter();
  return (
    <div className="relative isolate mx-auto grid min-h-[70dvh] max-w-site place-items-center px-4 py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
      <div className="max-w-md text-center">
        <p
          aria-hidden="true"
          className="font-mono font-semibold text-[7rem] text-ink leading-none tracking-tighter"
        >
          404
        </p>
        <Icon name="codicon:compass" size={20} className="mt-6 text-fg-muted" />
        <h1 className="mt-3 font-semibold text-2xl">This page wandered off</h1>
        <p className="mt-2 text-fg-secondary text-md">
          The address may be mistyped, or the page moved when the docs were reorganised.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href={href('/')} variant="primary" leadingIcon="codicon:home">
            Home
          </LinkButton>
          <LinkButton href={href('/docs/')} leadingIcon="codicon:book">
            Docs
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
