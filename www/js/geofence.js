/**
 * YardFlow - geofencing- ja koordinaattilaskenta (puhtaat funktiot, ei DOM-riippuvuuksia).
 * Ladataan ennen paaskriptia; kaikki funktiot ovat globaaleja.
 */

function normalizeGeofenceFields(obj) {
    if (!obj) return obj;
    if (obj.geofence_enabled === undefined) obj.geofence_enabled = true;
    else obj.geofence_enabled = !!obj.geofence_enabled;
    if (obj.geofence_type !== 'polygon' && obj.geofence_type !== 'radius') {
        obj.geofence_type = 'radius';
    }
    const r = Number(obj.geofence_radius);
    obj.geofence_radius = (!isNaN(r) && r >= 10 && r <= 1000) ? r : 80;
    return obj;
}

// 1. Haversine-etäisyyslaskenta kahden GPS-pisteen välille metreinä
function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
    const nLat1 = Number(lat1), nLng1 = Number(lng1), nLat2 = Number(lat2), nLng2 = Number(lng2);
    if (isNaN(nLat1) || isNaN(nLng1) || isNaN(nLat2) || isNaN(nLng2)) return null;
    const R = 6371000; // Maapallon säde metreinä
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(nLat2 - nLat1);
    const dLng = toRad(nLng2 - nLng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(nLat1)) * Math.cos(toRad(nLat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
window.calculateDistanceMeters = calculateDistanceMeters;

// 2. Monikulmiolaskenta (Ray-casting) satelliittirajoille
function isPointInPolygon(lat, lng, polygonPoints) {
    if (lat == null || lng == null || !Array.isArray(polygonPoints) || polygonPoints.length < 3) {
        return false;
    }
    const y = Number(lat);
    const x = Number(lng);
    if (isNaN(y) || isNaN(x)) return false;

    // Muunnetaan pisteet yhtenäiseen [lat, lng] -muotoon
    // Huom: Jos syötteenä on GeoJSON-rengas ([lng, lat], jossa Suomessa lng ~19..32 ja lat ~59..71), tunnistetaan se automaattisesti
    const pts = polygonPoints.map(p => {
        if (Array.isArray(p)) {
            const a = Number(p[0]);
            const b = Number(p[1]);
            // Jos ensimmäinen arvo on pituuspiiri (esim. 19..33) ja toinen leveyspiiri (59..71), kyseessä on GeoJSON [lng, lat]
            if (a >= 18 && a <= 35 && b >= 58 && b <= 72) {
                return { lat: b, lng: a };
            }
            return { lat: a, lng: b };
        }
        if (p && typeof p === 'object') {
            return {
                lat: Number(p.lat !== undefined ? p.lat : p.latitude),
                lng: Number(p.lng !== undefined ? p.lng : (p.lon !== undefined ? p.lon : p.longitude))
            };
        }
        return { lat: NaN, lng: NaN };
    }).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));

    if (pts.length < 3) return false;

    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const yi = pts[i].lat, xi = pts[i].lng;
        const yj = pts[j].lat, xj = pts[j].lng;
        const intersect = ((yi > y) !== (yj > y)) &&
                          (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
window.isPointInPolygon = isPointInPolygon;

// Palauttaa kohteen piirretyt satelliittipolygonit (taulukko kulmapistetaulukoita [lat, lng])
function extractPropertyPolygons(property) {
    const rings = [];
    if (!property) return rings;

    if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
        rings.push(property.polygon);
    }
    if (Array.isArray(property.polygons)) {
        property.polygons.forEach(r => { if (Array.isArray(r) && r.length >= 3) rings.push(r); });
    }

    let geo = property.areaGeoJSON;
    if ((!geo || !Array.isArray(geo.features) || !geo.features.length) && typeof getSavedGeoJSONForTarget === 'function' && typeof makeTargetGeoKey === 'function') {
        const key = makeTargetGeoKey(property.name, property.address);
        geo = getSavedGeoJSONForTarget(key);
    }

    if (geo && Array.isArray(geo.features)) {
        geo.features.forEach(f => {
            const geom = f && f.geometry;
            if (!geom) return;
            if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
                const ring = geom.coordinates[0].map(c => [c[1], c[0]]);
                if (ring.length >= 3) rings.push(ring);
            } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
                geom.coordinates.forEach(poly => {
                    if (Array.isArray(poly) && poly[0]) {
                        const ring = poly[0].map(c => [c[1], c[0]]);
                        if (ring.length >= 3) rings.push(ring);
                    }
                });
            }
        });
    }
    return rings;
}

// 3. Tarkistaa onko kuljettaja kiinteistöllä (geofence_enabled, polygon tai radius + 50m GPS-toleranssi)
function isDriverAtProperty(driverLat, driverLng, property, toleranceMeters = 50) {
    const prop = property || {};
    const tol = (toleranceMeters != null && !isNaN(toleranceMeters)) ? Number(toleranceMeters) : 50;
    const radius = Number(prop.geofence_radius) || 80;
    const maxAllowedMeters = radius + tol;

    const propLat = prop.lat != null ? Number(prop.lat) : null;
    const propLng = (prop.lon != null ? Number(prop.lon) : (prop.lng != null ? Number(prop.lng) : null));

    let distanceMeters = null;
    if (driverLat != null && driverLng != null && propLat != null && propLng != null) {
        const d = calculateDistanceMeters(driverLat, driverLng, propLat, propLng);
        if (d != null && !isNaN(d)) distanceMeters = Math.round(d);
    }

    // Jos geofence_enabled === false -> sallitaan heti
    if (prop.geofence_enabled === false) {
        return {
            allowed: true,
            verified_on_site: true,
            mode: 'disabled',
            distanceMeters: distanceMeters != null ? distanceMeters : 0,
            maxAllowedMeters
        };
    }

    if (driverLat == null || driverLng == null || isNaN(Number(driverLat)) || isNaN(Number(driverLng))) {
        return {
            allowed: false,
            verified_on_site: false,
            mode: prop.geofence_type || 'radius',
            distanceMeters: null,
            maxAllowedMeters,
            reason: 'no_driver_gps'
        };
    }

    // Jos geofence_type === 'polygon' ja kohteella on piirretyt rajat -> tarkistetaan onko piste monikulmiossa
    const polygons = extractPropertyPolygons(prop);
    if (prop.geofence_type === 'polygon' && polygons.length > 0) {
        let insideAny = false;
        let minVertexDist = Infinity;

        for (const ring of polygons) {
            if (isPointInPolygon(driverLat, driverLng, ring)) {
                insideAny = true;
                break;
            }
            for (const pt of ring) {
                const pLat = Array.isArray(pt) ? pt[0] : pt.lat;
                const pLng = Array.isArray(pt) ? pt[1] : (pt.lng ?? pt.lon);
                const vd = calculateDistanceMeters(driverLat, driverLng, pLat, pLng);
                if (vd != null && vd < minVertexDist) minVertexDist = vd;
            }
        }

        // Jos ei suoraan monikulmion sisällä, tarkistetaan GPS-toleranssi (toleranceMeters) monikulmion reunoista
        if (!insideAny && minVertexDist <= tol) {
            insideAny = true;
        }

        const reportedDist = distanceMeters != null
            ? distanceMeters
            : (isFinite(minVertexDist) ? Math.round(minVertexDist) : null);

        return {
            allowed: insideAny,
            verified_on_site: insideAny,
            mode: 'polygon',
            distanceMeters: insideAny ? (reportedDist || 0) : reportedDist,
            maxAllowedMeters: tol
        };
    }

    // Jos geofence_type === 'radius' (tai rajaton fallback) -> tarkistetaan etäisyys kohteeseen (säde + 50 m GPS-toleranssi)
    if (distanceMeters == null) {
        return {
            allowed: false,
            verified_on_site: false,
            mode: 'radius',
            distanceMeters: null,
            maxAllowedMeters,
            reason: 'missing_property_coords'
        };
    }

    const isInsideRadius = distanceMeters <= maxAllowedMeters;
    return {
        allowed: isInsideRadius,
        verified_on_site: isInsideRadius,
        mode: 'radius',
        distanceMeters,
        maxAllowedMeters
    };
}
window.isDriverAtProperty = isDriverAtProperty;

// Geokoodauksen etaisyyslaskenta kilometreina
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const dist = (a, b) => getDistanceKm(a.lat, a.lon, b.lat, b.lon);

// Muuntaa yksittäisen pisteen (lat, lng) käännettäväksi ja kokoa muutettavaksi laatikko-polygoniksi (~5m x 3m)
function pointToBoxLatLngs(lat, lng, widthM = 5, heightM = 3.2) {
    const dLat = (heightM / 2) / 111320;
    const cosLat = Math.cos((lat * Math.PI) / 180) || 0.5;
    const dLng = (widthM / 2) / (111320 * cosLat);
    return [
        [lat - dLat, lng - dLng],
        [lat - dLat, lng + dLng],
        [lat + dLat, lng + dLng],
        [lat + dLat, lng - dLng]
    ];
}
