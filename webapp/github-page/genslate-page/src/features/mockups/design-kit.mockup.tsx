import darkShot from '../../../../../../other/resources/screenshots/example.polar-night.png';
import lightShot from '../../../../../../other/resources/screenshots/example.snow-storm.png';

/**
 * The Design Kit exists, so it gets real screenshots (other/resources/screenshots) instead of a
 * mockup — one per theme, switched by the nearest `data-theme` (see `--site-show-*`).
 */
export function DesignKitMockup() {
  return (
    <div className="mock-window size-full overflow-hidden rounded-window bg-canvas">
      <img
        src={darkShot}
        alt=""
        width={1280}
        height={800}
        decoding="async"
        loading="lazy"
        className="size-full"
        style={{ display: 'var(--site-show-dark)' }}
      />
      <img
        src={lightShot}
        alt=""
        width={1280}
        height={800}
        decoding="async"
        loading="lazy"
        className="size-full"
        style={{ display: 'var(--site-show-light)' }}
      />
    </div>
  );
}
