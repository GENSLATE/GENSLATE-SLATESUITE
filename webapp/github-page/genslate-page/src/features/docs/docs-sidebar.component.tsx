import { Sidebar, SidebarItem, SidebarSection } from '@genslate/design-system';

import { useRouter } from '../../app/router/router.context';
import { DOC_GROUPS } from '../../content/docs.content';

/** The docs navigation: a macOS source list, one section per docs group. */
export function DocsSidebar({ current }: { readonly current?: string }) {
  const { href } = useRouter();
  return (
    <Sidebar aria-label="Docs" className="h-auto bg-transparent">
      <SidebarItem
        href={href('/docs/')}
        icon="codicon:home"
        selected={current === undefined}
        className="mb-3 cursor-pointer"
      >
        Overview
      </SidebarItem>
      {DOC_GROUPS.map((group) => (
        <SidebarSection key={group.title} title={group.title}>
          {group.pages.map((page) => (
            <SidebarItem
              key={page.slug}
              href={href(page.route)}
              icon={page.icon}
              selected={page.slug === current}
              className="cursor-pointer"
            >
              {page.title}
            </SidebarItem>
          ))}
        </SidebarSection>
      ))}
    </Sidebar>
  );
}
