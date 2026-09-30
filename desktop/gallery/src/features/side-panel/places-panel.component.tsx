import { SidebarContent, SidebarSection, Tree, TreeItem } from '@genslate/design-system';
import { useState } from 'react';

import { useGallery } from '../../app/gallery.context';
import type { PlaceCount } from '../../ipc/gallery.types';
import { countryName } from '../../model/format.util';

interface Country {
  readonly code: string;
  readonly name: string;
  readonly count: number;
  readonly cities: readonly PlaceCount[];
}

/** Groups the places by country, the most photographed first. */
function byCountry(places: readonly PlaceCount[]): readonly Country[] {
  const countries = new Map<string, PlaceCount[]>();
  for (const place of places) {
    const cities = countries.get(place.country) ?? [];
    cities.push(place);
    countries.set(place.country, cities);
  }
  return [...countries]
    .map(([code, cities]) => ({
      code,
      name: countryName(code),
      count: cities.reduce((sum, city) => sum + city.count, 0),
      cities: cities.toSorted((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const countryId = (code: string) => `country:${code}`;
const cityId = (code: string, city: string) => `city:${code}:${city}`;

/**
 * The Places tab: where photos were taken, from their GPS position, named offline (no map
 * service is called).
 */
export function PlacesPanel() {
  const api = useGallery();
  const countries = byCountry(api.summary?.places ?? []);
  const [expanded, setExpanded] = useState<readonly string[]>([]);
  const { collection } = api;
  const selected =
    collection.type !== 'place'
      ? null
      : collection.city === null
        ? countryId(collection.country)
        : cityId(collection.country, collection.city);

  const select = (id: string) => {
    for (const country of countries) {
      if (id === countryId(country.code)) {
        api.setCollection({ type: 'place', country: country.code, city: null });
      }
      for (const city of country.cities) {
        if (id === cityId(country.code, city.city)) {
          api.setCollection({ type: 'place', country: country.code, city: city.city });
        }
      }
    }
    api.setMode({ type: 'browse' });
  };

  return (
    <SidebarContent aria-label="Places">
      <SidebarSection title="Countries and cities">
        {countries.length === 0 ? (
          <p className="mx-4 py-1 text-fg-muted text-sm">
            Photos with a GPS position show up here, grouped by where they were taken.
          </p>
        ) : (
          <Tree
            aria-label="Places"
            className="px-2"
            selected={selected}
            onSelect={select}
            expanded={expanded}
            onExpandedChange={setExpanded}
          >
            {countries.map((country) => (
              <TreeItem
                key={country.code}
                id={countryId(country.code)}
                label={country.name}
                icon="codicon:globe"
                trailing={<Count value={country.count} />}
              >
                {country.cities.map((city) => (
                  <TreeItem
                    key={city.city}
                    id={cityId(country.code, city.city)}
                    label={city.city}
                    icon="codicon:location"
                    title={city.region === '' ? city.city : `${city.city}, ${city.region}`}
                    trailing={<Count value={city.count} />}
                  />
                ))}
              </TreeItem>
            ))}
          </Tree>
        )}
      </SidebarSection>
    </SidebarContent>
  );
}

function Count({ value }: { readonly value: number }) {
  return <span className="text-2xs text-fg-muted tabular-nums">{value.toLocaleString()}</span>;
}
