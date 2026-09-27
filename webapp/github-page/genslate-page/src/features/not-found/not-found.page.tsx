import { EmptyState } from '@genslate/design-system';

import { useRouter } from '../../app/router/router.context';
import { LinkButton } from '../../components/link-button.component';

/** 404 — also served by GitHub Pages for any unknown path (404.html). */
export function NotFoundPage() {
  const { href } = useRouter();
  return (
    <div className="relative isolate mx-auto grid min-h-[70dvh] max-w-site place-items-center px-4 py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots" />
      <div className="text-center">
        <p className="font-mono font-semibold text-[7rem] text-ink leading-none tracking-tighter">
          404
        </p>
        <EmptyState
          icon="codicon:compass"
          title={<h1 className="font-semibold text-2xl">This page wandered off</h1>}
          description="The address may be mistyped, or the page moved when the docs were reorganised."
          actions={
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton href={href('/')} variant="primary" leadingIcon="codicon:home">
                Home
              </LinkButton>
              <LinkButton href={href('/docs/')} leadingIcon="codicon:book">
                Docs
              </LinkButton>
            </div>
          }
        />
      </div>
    </div>
  );
}
