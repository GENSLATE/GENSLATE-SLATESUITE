import { Sidebar, SidebarContent, SidebarItem, SidebarSection } from '@genslate/design-system';
import { SHOWCASE_GROUPS } from '../showcase/showcase.registry';

interface AppSidebarProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Source list of every showcase page, grouped by category. */
export function AppSidebar({ selectedId, onSelect }: AppSidebarProps) {
  return (
    <Sidebar aria-label="Showcase pages">
      <SidebarContent aria-label="Pages" className="pt-1.5">
        {SHOWCASE_GROUPS.filter((group) => group.sections.length > 0).map((group) => (
          <SidebarSection key={group.id} title={group.title}>
            {group.sections.map((section) => (
              <SidebarItem
                key={section.id}
                icon={section.icon}
                selected={section.id === selectedId}
                onClick={() => onSelect(section.id)}
              >
                {section.title}
              </SidebarItem>
            ))}
          </SidebarSection>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
