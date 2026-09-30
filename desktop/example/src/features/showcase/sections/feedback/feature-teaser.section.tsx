import { Badge, FeatureTeaser, FeatureTeaserSample } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function FeatureTeaserSection() {
  return (
    <Specimen
      title="Feature teaser"
      description="How every app previews a feature still to come: glyph, name, a Coming soon badge, one sentence, then a faded sample."
      stageClassName="grid grid-cols-2 items-start gap-6 p-4"
    >
      <div className="inset-ring inset-ring-border-subtle rounded-card bg-surface-sidebar pb-4">
        <FeatureTeaser icon="codicon:sparkle" title="Photo assistant">
          Find photos by describing them and build albums, with a local model that never uploads
          your pictures.
        </FeatureTeaser>
        <FeatureTeaserSample label="Example">
          <div className="flex flex-wrap gap-1.5">
            {['mountains', 'golden hour', 'lake'].map((tag) => (
              <Badge key={tag} size="sm" pill>
                {tag}
              </Badge>
            ))}
          </div>
        </FeatureTeaserSample>
      </div>
      <div className="inset-ring inset-ring-border-subtle rounded-card bg-surface-popover">
        <FeatureTeaser icon="codicon:git-merge" title="Git" level={3} labels={{ soon: 'Preview' }}>
          Stage, commit and compare without leaving the app.
        </FeatureTeaser>
      </div>
    </Specimen>
  );
}
