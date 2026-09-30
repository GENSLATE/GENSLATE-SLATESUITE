//! Offline reverse geocoding: GPS coordinates → the nearest city (`GeoNames` cities with more
//! than 1000 people, embedded by `reverse_geocoder`). Nothing is sent over the network.

use std::sync::OnceLock;

use reverse_geocoder::ReverseGeocoder;
use serde::Serialize;

/// Photos further than this from any known city get no place.
const MAX_DISTANCE_KM: f64 = 60.0;

/// Where a photo was taken.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Place {
    /// "Lisbon".
    pub city: String,
    /// The state, region or province ("Lisbon", "California").
    pub region: String,
    /// ISO 3166 country code ("PT"); the UI shows the country's name.
    pub country: String,
}

fn geocoder() -> &'static ReverseGeocoder {
    static GEOCODER: OnceLock<ReverseGeocoder> = OnceLock::new();
    GEOCODER.get_or_init(ReverseGeocoder::new)
}

/// The city nearest to `latitude`, `longitude`, if one is close enough.
pub fn lookup(latitude: f64, longitude: f64) -> Option<Place> {
    let result = geocoder().search((latitude, longitude));
    // `distance` is the squared distance between points on the unit sphere.
    let km = result.distance.max(0.0).sqrt() * 6371.0;
    if km > MAX_DISTANCE_KM {
        return None;
    }
    let record = result.record;
    Some(Place {
        city: record.name.clone(),
        region: record.admin1.clone(),
        country: record.cc.clone(),
    })
}

/// Loads the city index on a background thread so the first lookup is instant.
pub fn warm_up() {
    let spawned = std::thread::Builder::new()
        .name("gallery-places".to_owned())
        .spawn(|| {
            geocoder();
        });
    if let Err(error) = spawned {
        log::debug!("places warm-up: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_cities_offline() {
        let lisbon = lookup(38.7223, -9.1393);
        assert_eq!(
            lisbon.as_ref().map(|place| place.country.as_str()),
            Some("PT")
        );
        assert_eq!(lisbon.map(|place| place.city), Some("Lisbon".to_owned()));
        let tokyo = lookup(35.6762, 139.6503);
        assert_eq!(tokyo.map(|place| place.country), Some("JP".to_owned()));
    }

    #[test]
    fn open_ocean_has_no_place() {
        assert_eq!(lookup(-40.0, -130.0), None);
    }
}
