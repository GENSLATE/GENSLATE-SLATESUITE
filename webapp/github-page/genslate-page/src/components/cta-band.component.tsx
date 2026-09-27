import { useRouter } from '../app/router/router.context';
import { REPO_LINKS } from '../app/site.defaults';
import { BrandMark } from './brand-mark.component';
import { LinkButton } from './link-button.component';

/** The closing call to action: download, or read the docs. */
export function CtaBand({
  title = 'Carry your desktop in your pocket.',
  lead = 'Download the preview, unzip it anywhere and press Ctrl+Alt+Space.',
}: {
  readonly title?: string;
  readonly lead?: string;
}) {
  const { href } = useRouter();
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-site px-4 sm:px-6">
      <div className="reveal relative isolate overflow-hidden rounded-[28px] border border-border-subtle bg-surface-raised px-6 py-16 text-center shadow-dialog md:py-20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dots opacity-70" />
        <div
          aria-hidden="true"
          className="aurora-blob-a absolute -top-1/2 left-1/4 -z-10 h-[140%] w-1/2 rounded-full blur-[90px]"
          style={{ background: 'var(--site-glow-b)' }}
        />
        <a
          href={href('/')}
          className="mark mx-auto inline-block rounded-xl"
          aria-label="GENSLATE home"
        >
          <BrandMark className="size-14" />
        </a>
        <h2 id="cta-title" className="mt-6 font-semibold text-display">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-fg-secondary text-lead">{lead}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton
            href={href('/download/')}
            variant="primary"
            leadingIcon="codicon:cloud-download"
          >
            Download
          </LinkButton>
          <LinkButton href={href('/docs/')} leadingIcon="codicon:book">
            Read the docs
          </LinkButton>
          <LinkButton href={REPO_LINKS.home} external variant="ghost" leadingIcon="codicon:github">
            View on GitHub
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
