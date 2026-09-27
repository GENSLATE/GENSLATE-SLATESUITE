import { CtaBand } from '../../components/cta-band.component';
import { HeroSection } from './hero.section';
import { LauncherSection } from './launcher.section';
import { PortableSection } from './portable.section';
import { ShowcaseSection } from './showcase.section';
import { StackSection } from './stack.section';
import { SuiteSection } from './suite.section';
import { ThemesSection } from './themes.section';

/** The landing page. */
export function HomePage() {
  return (
    <>
      <HeroSection />
      <SuiteSection />
      <LauncherSection />
      <ShowcaseSection />
      <PortableSection />
      <ThemesSection />
      <StackSection />
      <CtaBand />
    </>
  );
}
