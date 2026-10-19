// ============================================================
// YardFlow - Leaflet-kartta, tasojen vaihto, alueiden muokkaus ja markkerit (js/map.js)
// ============================================================

// Käänteinen geokoodaus (Reverse Geocode) Nominatim OSM:n kautta
async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`, {
            headers: { 'Accept-Language': 'fi, en' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data) return null;
        const a = data.address || {};
        const road = a.road || a.pedestrian || a.street || a.neighbourhood || '';
        const houseNumber = a.house_number || '';
        const city = a.city || a.town || a.municipality || a.village || '';
        let addr = road ? (houseNumber ? `${road} ${houseNumber}` : road) : (data.name || '');
        if (city && addr && !addr.includes(city)) addr = `${addr}, ${city}`;
        return addr || data.display_name || null;
    } catch (e) {
        console.warn('Reverse geocode error:', e);
        return null;
    }
}
window.reverseGeocode = reverseGeocode;

// Puhdas sijaintineula ilman tekstilaatikkoa (väri oranssi/amber siirtotilassa, sininen lukittuna)
function getPinDropIcon(isDraggable = false) {
    const pinColor = isDraggable ? '#f59e0b' : '#0284c7';
    return L.divIcon({
        className: 'yard-pin-marker-wrapper',
        html: `<div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events: auto;">
            <div style="width: 24px; height: 24px; background: ${pinColor}; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(0,0,0,0.45); cursor: ${isDraggable ? 'grab' : 'pointer'};">
                <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; margin: 5px auto 0 auto;"></div>
            </div>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
}

function updatePinMarkerDraggableState() {
    if (!yardPinDropMarker) return;
    const canDrag = (activePinMovingTaskId != null) || (isPinDropModeActive && (pinDropTargetContext === 'addTask' || pinDropTargetContext === 'editTask'));
    if (yardPinDropMarker.dragging) {
        if (canDrag) yardPinDropMarker.dragging.enable();
        else yardPinDropMarker.dragging.disable();
    }
    yardPinDropMarker.setIcon(getPinDropIcon(canDrag));
}

async function applyPinDropCoordinates(lat, lng, shouldReverseGeocode = true) {
    if (!yardMap) return;

    const canDrag = (activePinMovingTaskId != null) || (isPinDropModeActive && (pinDropTargetContext === 'addTask' || pinDropTargetContext === 'editTask'));

    if (!yardPinDropMarker) {
        yardPinDropMarker = L.marker([lat, lng], {
            draggable: canDrag,
            icon: getPinDropIcon(canDrag),
            zIndexOffset: 1200,
            pmIgnore: true
        }).addTo(yardMap);

        yardPinDropMarker.on('dragend', e => {
            const canMove = (activePinMovingTaskId != null) || (isPinDropModeActive && (pinDropTargetContext === 'addTask' || pinDropTargetContext === 'editTask'));
            if (canMove) {
                const pos = e.target.getLatLng();
                applyPinDropCoordinates(pos.lat, pos.lng, true);
            }
        });
    } else {
        yardPinDropMarker.setLatLng([lat, lng]);
        yardPinDropMarker.setIcon(getPinDropIcon(canDrag));
        if (yardPinDropMarker.dragging) {
            if (canDrag) yardPinDropMarker.dragging.enable();
            else yardPinDropMarker.dragging.disable();
        }
        if (!yardMap.hasLayer(yardPinDropMarker)) {
            yardPinDropMarker.addTo(yardMap);
        }
    }

    let target = null;
    let targetKey = currentMapTargetKey || 'default_yard';

    if (pinDropTargetContext === 'addTask') {
        setYardMapStatus(`📍 Sijaintipiste asetettu: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Haetaan osoitetta...`);
        if (shouldReverseGeocode) {
            const revAddr = await reverseGeocode(lat, lng);
            const addrInput = document.getElementById('address');
            if (revAddr) {
                if (addrInput) addrInput.value = revAddr;
                setYardMapStatus(`📍 Uuden kohteen osoite: ${revAddr} (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
            } else {
                setYardMapStatus(`📍 Sijaintipiste tallennettu (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
            }
        }
        if (yardGeofenceCircle) {
            yardGeofenceCircle.setLatLng([lat, lng]);
        }
        return;
    }

    if (activePinMovingTaskId != null) {
        const t = tasks.find(x => x.id === activePinMovingTaskId);
        if (t) {
            t.lat = lat;
            t.lon = lng;
            t.gps = true;
            target = t;
            targetKey = makeTargetGeoKey(t.name, t.address);
        }
    } else if (pinDropTargetContext === 'editTask' && editingId != null) {
        const t = tasks.find(x => x.id === editingId);
        if (t) {
            t.lat = lat;
            t.lon = lng;
            t.gps = true;
            target = t;
            targetKey = makeTargetGeoKey(t.name, t.address);
        }
    } else {
        target = resolveMapTargetObject(currentMapTargetKey);
        if (target) {
            target.lat = lat;
            target.lon = lng;
            if (target.taskRef) {
                target.taskRef.lat = lat;
                target.taskRef.lon = lng;
                target.taskRef.gps = true;
            }
            if (target.custRef) {
                target.custRef.lat = lat;
                target.custRef.lon = lng;
            }
            targetKey = target.key;
        }
    }

    renderYardGeofenceCircle(null, targetKey);

    if (shouldReverseGeocode) {
        setYardMapStatus(`📍 Koordinaatit: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Haetaan katuosoitetta...`);
        const revAddr = await reverseGeocode(lat, lng);
        if (revAddr) {
            if (pinDropTargetContext === 'editTask') {
                const editAddrEl = document.getElementById('editAddress');
                if (editAddrEl) editAddrEl.value = revAddr;
                if (target) target.address = revAddr;
            }
            setYardMapStatus(`📍 Sijainti asetettu: ${revAddr} (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        } else {
            setYardMapStatus(`📍 Sijaintipiste asetettu: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    }

    localStorage.setItem('pihatyot_tasks_v4', JSON.stringify(tasks));
    localStorage.setItem('pihatyot_customers_v1', JSON.stringify(customers));
    renderTasks();
}
window.applyPinDropCoordinates = applyPinDropCoordinates;

// Kohteen kortin kautta käynnistettävä sijainnin siirtotila
function startMovingCardPin(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    activePinMovingTaskId = taskId;
    pinDropTargetContext = 'moveCardPin';
    isPinDropModeActive = true;

    selectActiveProperty(taskId, false);

    if (yardMap) {
        let lat = task.lat;
        let lon = task.lon;
        if (!lat || !lon) {
            const c = yardMap.getCenter();
            lat = c.lat;
            lon = c.lng;
            task.lat = lat;
            task.lon = lon;
            task.gps = true;
        }
        yardMap.flyTo([lat, lon], 18, { duration: 0.8 });
        applyPinDropCoordinates(lat, lon, false);
    }

    updatePinMarkerDraggableState();
    renderTasks();

    setYardMapStatus(`📍 Kohteen "${task.name}" sijainti avattu siirrettäväksi! Klikkaa karttaa tai raahaa merkkiä. Paina kortista "✓ Sijainti OK" kun olet valmis.`);
}
window.startMovingCardPin = startMovingCardPin;

function stopMovingCardPin(taskId) {
    const task = tasks.find(t => t.id === taskId);
    activePinMovingTaskId = null;
    isPinDropModeActive = false;
    pinDropTargetContext = null;

    updatePinMarkerDraggableState();
    renderTasks();

    setYardMapStatus(`✓ Kohteen "${task ? task.name : ''}" sijainti tallennettu ja lukittu.`);
}
window.stopMovingCardPin = stopMovingCardPin;

function toggleMoveCardPin(taskId, event) {
    if (event) event.stopPropagation();
    if (activePinMovingTaskId === taskId) {
        stopMovingCardPin(taskId);
    } else {
        startMovingCardPin(taskId);
    }
}
window.toggleMoveCardPin = toggleMoveCardPin;

function enableMapPinDropMode(context = 'current') {
    isPinDropModeActive = true;
    pinDropTargetContext = context;

    if (yardMap && yardMap.pm) {
        yardMap.pm.disableDraw();
        yardMap.pm.disableGlobalEditMode();
        yardMap.pm.disableGlobalRemovalMode();
        if (typeof yardMap.pm.disableGlobalRotateMode === 'function') yardMap.pm.disableGlobalRotateMode();
    }
    clearToolbarActiveStates();

    switchTab('routes');

    let initialLat = null;
    let initialLng = null;

    if (context === 'editTask' && editingId != null) {
        const t = tasks.find(x => x.id === editingId);
        if (t && t.lat && t.lon) {
            initialLat = t.lat;
            initialLng = t.lon;
        }
        const diag = document.getElementById('editDialog');
        if (diag && typeof diag.close === 'function') diag.close();
    } else {
        const target = resolveMapTargetObject(currentMapTargetKey);
        if (target && target.lat && target.lon) {
            initialLat = target.lat;
            initialLng = target.lon;
        }
    }

    if (!initialLat || !initialLng) {
        if (yardMap) {
            const c = yardMap.getCenter();
            initialLat = c.lat;
            initialLng = c.lng;
        }
    }

    if (initialLat && initialLng) {
        applyPinDropCoordinates(initialLat, initialLng, false);
        if (yardMap) {
            yardMap.flyTo([initialLat, initialLng], 18, { duration: 0.8 });
        }
    }

    updatePinMarkerDraggableState();
    setYardMapStatus('📍 Sijaintitila päällä: Klikkaa karttaa tai raahaa merkkiä asettaaksesi kohteen tarkan sijainnin.');
}
window.enableMapPinDropMode = enableMapPinDropMode;

function disableMapPinDropMode() {
    isPinDropModeActive = false;
    pinDropTargetContext = null;
    activePinMovingTaskId = null;
    updatePinMarkerDraggableState();
    setYardMapStatus('Sijaintipisteen siirtotila suljettu.');
}
window.disableMapPinDropMode = disableMapPinDropMode;

function setYardMapStatus(msg) {
    const el = document.getElementById('yardMapStatus');
    if (el) el.textContent = msg;
}

// --- 3. Google Street View -linkitys ---
function buildStreetViewUrl(lat, lon) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
}

async function openStreetViewWithCoordsOrAddress(obj, onCoordsFound) {
    if (!obj) return;
    if (obj.lat && obj.lon) {
        window.open(buildStreetViewUrl(obj.lat, obj.lon), '_blank', 'noopener');
        return;
    }
    const matchTask = tasks.find(t => t.lat && t.lon && t.address && obj.address && t.address.toLowerCase() === obj.address.toLowerCase());
    if (matchTask) {
        obj.lat = matchTask.lat;
        obj.lon = matchTask.lon;
        if (onCoordsFound) onCoordsFound(obj.lat, obj.lon);
        window.open(buildStreetViewUrl(obj.lat, obj.lon), '_blank', 'noopener');
        return;
    }

    const win = window.open('about:blank', '_blank');
    showStatus(`Haetaan kohteen "${esc(obj.name || obj.address)}" koordinaatteja Street View -näkymään...`, 'loading');
    const c = await fetchCoordinates(obj.address);
    if (c && c.lat && c.lon) {
        obj.lat = c.lat;
        obj.lon = c.lon;
        if (onCoordsFound) onCoordsFound(c.lat, c.lon);
        const url = buildStreetViewUrl(c.lat, c.lon);
        if (win) win.location.href = url;
        else window.open(url, '_blank', 'noopener');
        showStatus(`Street View avattu kohteelle "${esc(obj.name || obj.address)}".`, 'success');
    } else {
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(obj.address || obj.name || '')}`;
        if (win) win.location.href = fallbackUrl;
        else window.open(fallbackUrl, '_blank', 'noopener');
        showStatus('Tarkkoja koordinaatteja ei löytynyt, avattiin osoitehaku.', 'info');
    }
}

function openStreetViewForTask(taskId) {
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;
    openStreetViewWithCoordsOrAddress(t, () => saveAndRender());
}

function openStreetViewForCustomer(custId) {
    const c = customers.find(x => String(x.id) === String(custId));
    if (!c) return;
    openStreetViewWithCoordsOrAddress(c, () => persistCustomers());
}

function openStreetViewCurrentMapTarget() {
    const target = resolveMapTargetObject(currentMapTargetKey);
    if (target) {
        openStreetViewWithCoordsOrAddress(target, (lat, lon) => {
            target.lat = lat;
            target.lon = lon;
            saveAndRender();
            persistCustomers();
        });
        return;
    }
    if (yardMap) {
        const center = yardMap.getCenter();
        window.open(buildStreetViewUrl(center.lat, center.lng), '_blank', 'noopener');
    }
}

// --- Kohteen valinta ja synkronointi ---
function getAllMapTargets() {
    const list = [];
    const seen = new Set();

    tasks.forEach(t => {
        const key = makeTargetGeoKey(t.name, t.address);
        if (!seen.has(key)) {
            seen.add(key);
            list.push({
                key,
                name: t.name,
                address: t.address,
                lat: t.lat,
                lon: t.lon,
                taskRef: t,
                custRef: customers.find(c => makeTargetGeoKey(c.name, c.address) === key) || null
            });
        }
    });

    customers.forEach(c => {
        const key = makeTargetGeoKey(c.name, c.address);
        if (!seen.has(key)) {
            seen.add(key);
            list.push({
                key,
                name: c.name,
                address: c.address,
                lat: c.lat || null,
                lon: c.lon || null,
                taskRef: null,
                custRef: c
            });
        }
    });

    return list;
}

function resolveMapTargetObject(key) {
    const all = getAllMapTargets();
    if (!all.length) return null;
    return all.find(x => x.key === key) || all[0];
}

function getSavedGeoJSONForTarget(key) {
    const k = key || 'default_yard';
    const target = getAllMapTargets().find(x => x.key === k);
    if (target?.taskRef?.areaGeoJSON && target.taskRef.areaGeoJSON.features) {
        return target.taskRef.areaGeoJSON;
    }
    if (target?.custRef?.areaGeoJSON && target.custRef.areaGeoJSON.features) {
        return target.custRef.areaGeoJSON;
    }
    if (yardGeoStore[k] && yardGeoStore[k].features) {
        return yardGeoStore[k];
    }
    return { type: 'FeatureCollection', features: [] };
}

function persistGeoJSONForTarget(key, featureCollection) {
    const k = key || 'default_yard';
    yardGeoStore[k] = featureCollection;
    try {
        localStorage.setItem(YARD_GEOJSON_STORAGE_KEY, JSON.stringify(yardGeoStore));
    } catch (e) {
        console.warn('GeoJSON tallennusvirhe:', e);
    }

    let tasksUpdated = false;
    tasks.forEach(t => {
        if (makeTargetGeoKey(t.name, t.address) === k) {
            t.areaGeoJSON = featureCollection;
            tasksUpdated = true;
        }
    });
    if (tasksUpdated) {
        localStorage.setItem('pihatyot_tasks_v4', JSON.stringify(tasks));
    }

    let custUpdated = false;
    customers.forEach(c => {
        if (makeTargetGeoKey(c.name, c.address) === k) {
            c.areaGeoJSON = featureCollection;
            custUpdated = true;
        }
    });
    if (custUpdated) {
        localStorage.setItem('pihatyot_customers_v1', JSON.stringify(customers));
    }
}

function refreshYardMapTargetSelect() {
    const sel = document.getElementById('yardMapTargetSelect');
    if (!sel) return;
    const targets = getAllMapTargets();

    if (!targets.length) {
        sel.innerHTML = '<option value="default_yard">-- Yleiskartta (lisää kohde tai piirrä suoraan) --</option>';
        currentMapTargetKey = 'default_yard';
        return;
    }

    if (!currentMapTargetKey || !targets.some(t => t.key === currentMapTargetKey)) {
        currentMapTargetKey = targets[0].key;
        localStorage.setItem(YARD_ACTIVE_TARGET_KEY, currentMapTargetKey);
    }

    sel.innerHTML = targets.map(t => {
        const geo = getSavedGeoJSONForTarget(t.key);
        const count = geo?.features?.length || 0;
        const countSuffix = count > 0 ? ` [${count} aluetta]` : '';
        return `<option value="${esc(t.key)}" ${t.key === currentMapTargetKey ? 'selected' : ''}>${esc(t.name)} — ${esc(t.address)}${countSuffix}</option>`;
    }).join('');
}

// Asettaa alueen värin sekä pysyvän tekstilaatikon alueen sisälle (Konealue, Käsityöalue, Lumenkaatoalue)
function applyLayerCategoryStyle(layer, category, targetKey) {
    const cat = YARD_CATEGORIES[category] || YARD_CATEGORIES.machine;
    const tKey = targetKey || layer._targetKey || currentMapTargetKey || 'default_yard';
    layer._yardCategory = cat.key;
    layer._targetKey = tKey;

    if (!layer.feature) {
        layer.feature = { type: 'Feature', properties: {}, geometry: null };
    }
    layer.feature.properties = Object.assign({}, layer.feature.properties, {
        category: cat.key,
        label: cat.label,
        targetKey: tKey
    });

    if (typeof layer.setStyle === 'function') {
        layer.setStyle({
            color: cat.color,
            weight: cat.weight,
            fillColor: cat.fillColor,
            fillOpacity: cat.fillOpacity
        });
    }

    if (typeof layer.bindTooltip === 'function') {
        layer.unbindTooltip();
        layer.bindTooltip(cat.boxText || cat.label, {
            permanent: true,
            direction: 'center',
            className: `yard-area-label cat-${cat.key}`,
            interactive: false
        });
    }
}

// Yhdistää vierekkäiset tai päällekkäiset saman kategorian alueet VAIN jos ne kuuluvat samalle osoitekortille
function tryMergeAdjacentSameCategory(sourceLayer) {
    if (!yardMap || !yardDrawnItems || typeof turf === 'undefined') return sourceLayer;
    if (!sourceLayer || typeof sourceLayer.toGeoJSON !== 'function') return sourceLayer;

    const catKey = sourceLayer._yardCategory || 'machine';
    const targetKey = sourceLayer._targetKey || currentMapTargetKey || 'default_yard';

    let currentGeo = sourceLayer.toGeoJSON();
    if (!currentGeo || !currentGeo.geometry || (currentGeo.geometry.type !== 'Polygon' && currentGeo.geometry.type !== 'MultiPolygon')) {
        return sourceLayer;
    }

    // Tarkistetaan ensin, koskettaako piirretty alue viereisen osoitekortin aluetta (niitä EI yhdistetä)
    let touchedNeighborCard = false;
    if (yardNeighborItems) {
        yardNeighborItems.eachLayer(nLayer => {
            if (nLayer._targetKey && nLayer._targetKey !== targetKey && nLayer._yardCategory === catKey && typeof nLayer.toGeoJSON === 'function') {
                try {
                    const nGeo = nLayer.toGeoJSON();
                    const buffered = turf.buffer(currentGeo, 0.0018, { units: 'kilometers' });
                    if (turf.booleanIntersects(buffered, nGeo)) {
                        touchedNeighborCard = true;
                    }
                } catch (e) {}
            }
        });
    }

    const layersToRemove = [];
    let mergedAny = false;
    let keepSearching = true;

    while (keepSearching) {
        keepSearching = false;
        const candidates = yardDrawnItems.getLayers();

        for (let i = 0; i < candidates.length; i++) {
            const other = candidates[i];
            if (other === sourceLayer || layersToRemove.includes(other)) continue;

            // ESTO: Jos kyseessä on eri osoitteen kortti, ei yhdistetä koskaan!
            const otherTargetKey = other._targetKey || other.feature?.properties?.targetKey || currentMapTargetKey;
            if (otherTargetKey !== targetKey) {
                touchedNeighborCard = true;
                continue;
            }

            // Yhdistetään vain saman kategorian alueet (esim. Konealue + Konealue)
            if (other._yardCategory !== catKey) continue;
            if (typeof other.toGeoJSON !== 'function') continue;

            try {
                const otherGeo = other.toGeoJSON();
                if (!otherGeo || !otherGeo.geometry || otherGeo.geometry.type !== 'Polygon') continue;

                const directTouch = turf.booleanIntersects(currentGeo, otherGeo);
                const nearTouch = !directTouch && turf.booleanIntersects(
                    turf.buffer(currentGeo, 0.0016, { units: 'kilometers' }),
                    otherGeo
                );

                if (directTouch || nearTouch) {
                    let unioned = null;
                    if (directTouch) {
                        unioned = turf.union(currentGeo, otherGeo);
                    }
                    // Jos alueiden välissä oli pieni rako (< 1.6 m) tai ne koskettivat vain yhdessä pisteessä:
                    if (!unioned || unioned.geometry.type !== 'Polygon') {
                        const bufA = turf.buffer(currentGeo, 0.0016, { units: 'kilometers' });
                        const bufB = turf.buffer(otherGeo, 0.0016, { units: 'kilometers' });
                        const bufU = turf.union(bufA, bufB);
                        if (bufU) {
                            const closed = turf.buffer(bufU, -0.0016, { units: 'kilometers' });
                            if (closed && closed.geometry && closed.geometry.type === 'Polygon') {
                                unioned = closed;
                            }
                        }
                    }

                    if (unioned && unioned.geometry && unioned.geometry.type === 'Polygon') {
                        currentGeo = unioned;
                        layersToRemove.push(other);
                        mergedAny = true;
                        keepSearching = true;
                        break;
                    }
                }
            } catch (err) {
                console.warn('Alueiden yhdistystarkistus epäonnistui:', err);
            }
        }
    }

    if (mergedAny) {
        layersToRemove.push(sourceLayer);
        layersToRemove.forEach(l => {
            if (yardDrawnItems.hasLayer(l)) yardDrawnItems.removeLayer(l);
            if (yardMap.hasLayer(l)) yardMap.removeLayer(l);
        });

        let newMergedLayer = null;
        const tempGeo = L.geoJSON(currentGeo);
        tempGeo.eachLayer(l => {
            if (!newMergedLayer) newMergedLayer = l;
        });

        if (newMergedLayer) {
            applyLayerCategoryStyle(newMergedLayer, catKey, targetKey);
            attachLayerEvents(newMergedLayer);
            yardDrawnItems.addLayer(newMergedLayer);
            setYardMapStatus(
                touchedNeighborCard
                    ? `✨ Saman kohteen ${YARD_CATEGORIES[catKey].label}-alueet yhdistettiin (viereisen osoitekortin aluetta ei yhdistetty).`
                    : `✨ Vierekkäiset ${YARD_CATEGORIES[catKey].label}-alueet yhdistettiin automaattisesti!`
            );
            return newMergedLayer;
        }
    } else if (touchedNeighborCard) {
        setYardMapStatus('ℹ️ Viereisen osoitteen aluetta ei yhdistetty, koska se kuuluu eri osoitekortille.');
    }

    return sourceLayer;
}

function attachLayerEvents(layer) {
    layer.on('click', e => {
        if (currentAppMode !== 'admin') return;
        if (L && L.DomEvent) L.DomEvent.stopPropagation(e);
        selectMapLayer(layer);
    });
    layer.on('dblclick', e => {
        if (currentAppMode !== 'admin') return;
        if (L && L.DomEvent) L.DomEvent.stopPropagation(e);
        if (layer.transform && layer.transform._enabled) {
            layer.transform.disable();
        }
        if (layer.pm && typeof layer.pm.enable === 'function') {
            layer.pm.enable({ allowSelfIntersection: false });
            setYardMapStatus('Kulmapisteiden hienosäätö: muokkaa kulmapisteitä tai klikkaa kartan tyhjää kohtaa tallentaaksesi.');
        }
    });
    layer.on('transform transformed rotateend scaleend dragend', () => {
        applyLayerCategoryStyle(layer, layer._yardCategory, layer._targetKey);
        saveCurrentTargetGeoJSON();
    });
    layer.on('pm:edit pm:dragend pm:rotateend pm:cut pm:markerdragend', () => {
        const finalLayer = tryMergeAdjacentSameCategory(layer);
        applyLayerCategoryStyle(finalLayer, finalLayer._yardCategory, finalLayer._targetKey);
        saveCurrentTargetGeoJSON();
    });
}

function selectMapLayer(layer) {
    if (currentAppMode !== 'admin') return;

    if (selectedMapLayer && selectedMapLayer !== layer) {
        if (selectedMapLayer.transform && selectedMapLayer.transform._enabled) {
            selectedMapLayer.transform.disable();
        }
        if (selectedMapLayer.pm && typeof selectedMapLayer.pm.enabled === 'function' && selectedMapLayer.pm.enabled()) {
            selectedMapLayer.pm.disable();
        }
        if (typeof selectedMapLayer.setStyle === 'function') {
            const prevCat = YARD_CATEGORIES[selectedMapLayer._yardCategory] || YARD_CATEGORIES.machine;
            selectedMapLayer.setStyle({ weight: prevCat.weight, dashArray: null });
        }
    }

    selectedMapLayer = layer;
    if (layer) {
        const cat = YARD_CATEGORIES[layer._yardCategory] || YARD_CATEGORIES.machine;
        if (typeof layer.setStyle === 'function') {
            layer.setStyle({ weight: Math.max(cat.weight, 4), dashArray: '6, 4' });
        }

        // Alustetaan ja aktivoidaan Leaflet.Path.Transform (All-in-One Transform)
        if (!layer.transform && typeof L !== 'undefined' && L.Handler && L.Handler.PathTransform) {
            layer.transform = new L.Handler.PathTransform(layer, {
                rotation: true,
                scaling: true,
                uniformScaling: false,
                handleLength: 26,
                boundsOptions: { color: '#0284c7', weight: 1.5, dashArray: '5, 5', fill: false },
                rotateHandleOptions: { color: '#f59e0b', weight: 2 },
                handlerOptions: { className: 'leaflet-drag-transform-marker' }
            });
        }

        if (layer.transform) {
            layer.transform.enable();
        }

        setYardMapStatus(`Valittu: ${cat.label} — Siirrä raahaamalla sisältä, muuta kokoa kulmista, käännä yläkahvasta. Tuplaklikkaa säätääksesi kulmapisteitä.`);
    }
}

function saveCurrentTargetGeoJSON() {
    if (!yardDrawnItems) return;
    const features = [];
    yardDrawnItems.eachLayer(layer => {
        if (typeof layer.toGeoJSON === 'function') {
            const gj = layer.toGeoJSON();
            const catKey = layer._yardCategory || gj?.properties?.category || 'machine';
            const cat = YARD_CATEGORIES[catKey] || YARD_CATEGORIES.machine;
            const tKey = layer._targetKey || currentMapTargetKey || 'default_yard';
            gj.properties = Object.assign({}, gj.properties, {
                category: cat.key,
                label: cat.label,
                targetKey: tKey,
                updatedAt: new Date().toISOString()
            });
            features.push(gj);
        }
    });

    const fc = {
        type: 'FeatureCollection',
        features
    };
    persistGeoJSONForTarget(currentMapTargetKey || 'default_yard', fc);
    refreshYardMapTargetSelect();
}

// Piirtää muiden osoitekorttien alueet taustalle (jotta naapuritontin raja näkyy, mutta ne eivät yhdisty nykyisen kortin alueisiin)
function renderNeighborCardsOnMap(activeKey) {
    if (!yardMap || !yardNeighborItems) return;
    yardNeighborItems.clearLayers();
    const allTargets = getAllMapTargets();

    allTargets.forEach(t => {
        if (t.key === activeKey) return;
        const geo = getSavedGeoJSONForTarget(t.key);
        if (!geo || !Array.isArray(geo.features) || !geo.features.length) return;

        geo.features.forEach(feat => {
            const catKey = feat?.properties?.category || 'machine';
            const cat = YARD_CATEGORIES[catKey] || YARD_CATEGORIES.machine;
            let layer = null;

            if (feat.geometry && feat.geometry.type === 'Point') {
                const [lng, lat] = feat.geometry.coordinates;
                layer = L.polygon(pointToBoxLatLngs(lat, lng), { pmIgnore: true });
            } else {
                const grp = L.geoJSON(feat, { pmIgnore: true });
                grp.eachLayer(l => { if (!layer) layer = l; });
            }

            if (layer) {
                layer._yardCategory = cat.key;
                layer._targetKey = t.key;
                if (typeof layer.setStyle === 'function') {
                    layer.setStyle({
                        color: cat.color,
                        weight: 2,
                        dashArray: '4, 4',
                        fillColor: cat.fillColor,
                        fillOpacity: 0.16
                    });
                }
                if (typeof layer.bindTooltip === 'function') {
                    layer.bindTooltip(`${t.name}: ${cat.boxText}`, {
                        permanent: true,
                        direction: 'center',
                        className: 'yard-neighbor-label',
                        interactive: false
                    });
                }
                yardNeighborItems.addLayer(layer);
            }
        });
    });
}

// --- Geofence-ympyrän (L.circle) piirto ja synkronointi satelliittikartalle ---
function syncYardMapGeofenceControls(key) {
    const activeKey = key || currentMapTargetKey || 'default_yard';
    const target = resolveMapTargetObject(activeKey);
    const ref = target?.taskRef || target?.custRef || null;
    if (ref) normalizeGeofenceFields(ref);

    const enEl = document.getElementById('yardMapGeofenceEnabled');
    const typeEl = document.getElementById('yardMapGeofenceType');
    const radEl = document.getElementById('yardMapGeofenceRadius');
    const radValEl = document.getElementById('yardMapGeofenceRadiusVal');

    const enabled = ref ? (ref.geofence_enabled !== false) : true;
    const gType = ref?.geofence_type === 'polygon' ? 'polygon' : 'radius';
    const radius = ref ? (Number(ref.geofence_radius) || 80) : 80;

    if (enEl) enEl.checked = enabled;
    if (typeEl) typeEl.value = gType;
    if (radEl) radEl.value = radius;
    if (radValEl) radValEl.textContent = radius;
}
window.syncYardMapGeofenceControls = syncYardMapGeofenceControls;

function renderYardGeofenceCircle(customRadiusOverride = null, customTargetKey = null) {
    if (!yardMap || typeof L === 'undefined') return;
    const activeKey = customTargetKey || currentMapTargetKey || 'default_yard';
    const target = resolveMapTargetObject(activeKey);
    const ref = target?.taskRef || target?.custRef || null;
    if (ref) normalizeGeofenceFields(ref);

    const enabled = ref ? (ref.geofence_enabled !== false) : true;
    const gType = ref?.geofence_type || 'radius';
    const radius = customRadiusOverride != null
        ? Number(customRadiusOverride)
        : (ref ? (Number(ref.geofence_radius) || 80) : 80);

    if (!enabled && customRadiusOverride == null) {
        if (yardGeofenceCircle && yardMap.hasLayer(yardGeofenceCircle)) {
            yardMap.removeLayer(yardGeofenceCircle);
        }
        yardGeofenceCircle = null;
        return;
    }

    let centerLat = target?.lat || target?.taskRef?.lat || target?.custRef?.lat || null;
    let centerLon = target?.lon || target?.taskRef?.lon || target?.custRef?.lon || null;

    if ((!centerLat || !centerLon) && yardDrawnItems && yardDrawnItems.getLayers().length > 0) {
        try {
            const b = yardDrawnItems.getBounds();
            if (b && b.isValid()) {
                const c = b.getCenter();
                centerLat = c.lat;
                centerLon = c.lng;
            }
        } catch (e) {}
    }

    if (!centerLat || !centerLon) {
        const c = yardMap.getCenter();
        centerLat = c.lat;
        centerLon = c.lng;
    }

    const circleColor = gType === 'polygon' ? '#0ea5e9' : '#10b981';
    const circleStyle = {
        radius: radius,
        color: circleColor,
        weight: 2.5,
        dashArray: '8, 6',
        fillColor: circleColor,
        fillOpacity: gType === 'polygon' ? 0.05 : 0.12,
        interactive: false,
        pmIgnore: true
    };

    if (yardGeofenceCircle && yardMap.hasLayer(yardGeofenceCircle)) {
        yardGeofenceCircle.setLatLng([centerLat, centerLon]);
        yardGeofenceCircle.setRadius(radius);
        yardGeofenceCircle.setStyle(circleStyle);
    } else {
        yardGeofenceCircle = L.circle([centerLat, centerLon], circleStyle).addTo(yardMap);
    }

    if (yardGeofenceCircle && typeof yardGeofenceCircle.unbindTooltip === 'function') {
        yardGeofenceCircle.unbindTooltip();
        yardGeofenceCircle.bindTooltip(`🛰️ Geofence-säde: ${radius} m (+50 m GPS-toleranssi)`, {
            permanent: false,
            direction: 'top'
        });
    }
}
window.renderYardGeofenceCircle = renderYardGeofenceCircle;

function updateCurrentMapTargetGeofence(isLiveSlider = false) {
    const enEl = document.getElementById('yardMapGeofenceEnabled');
    const typeEl = document.getElementById('yardMapGeofenceType');
    const radEl = document.getElementById('yardMapGeofenceRadius');
    const radValEl = document.getElementById('yardMapGeofenceRadiusVal');

    const enabled = enEl ? enEl.checked : true;
    const gType = typeEl ? typeEl.value : 'radius';
    const radius = radEl ? (Number(radEl.value) || 80) : 80;
    if (radValEl) radValEl.textContent = radius;

    const activeKey = currentMapTargetKey || 'default_yard';
    let tasksChanged = false;
    tasks.forEach(t => {
        if (makeTargetGeoKey(t.name, t.address) === activeKey) {
            t.geofence_enabled = enabled;
            t.geofence_type = gType;
            t.geofence_radius = radius;
            tasksChanged = true;
        }
    });

    let custChanged = false;
    customers.forEach(c => {
        if (makeTargetGeoKey(c.name, c.address) === activeKey) {
            c.geofence_enabled = enabled;
            c.geofence_type = gType;
            c.geofence_radius = radius;
            custChanged = true;
        }
    });

    // Piirretään havainnollistava ympyrä (L.circle) välittömästi kartalle
    renderYardGeofenceCircle(enabled ? radius : null, activeKey);

    if (!isLiveSlider) {
        if (tasksChanged) {
            localStorage.setItem('pihatyot_tasks_v4', JSON.stringify(tasks));
            renderTasks();
        }
        if (custChanged) {
            persistCustomers();
            if (document.getElementById('viewCustomers').style.display !== 'none') renderCustomers();
        }
        setYardMapStatus(enabled
            ? `🛰️ Geofence päivitetty: ${gType === 'polygon' ? 'Satelliittikartan piharajat' : `Säde ${radius} m`} (+50 m GPS-toleranssi).`
            : '🛰️ Paikkatodennus (Geofence) kytketty pois päältä tälle kohteelle.');
    } else {
        setYardMapStatus(`🛰️ Geofence-ympyrä kartalla: säde ${radius} m (yht. ${radius + 50} m GPS-toleranssilla).`);
    }
}
window.updateCurrentMapTargetGeofence = updateCurrentMapTargetGeofence;

function previewGeofenceRadiusFromDialog(mode, val) {
    const radius = Number(val) || 80;
    let targetKey = currentMapTargetKey || 'default_yard';

    if (mode === 'editTask' && editingId != null) {
        const t = tasks.find(x => x.id === editingId);
        if (t) {
            t.geofence_radius = radius;
            targetKey = makeTargetGeoKey(t.name, t.address);
        }
    } else if (mode === 'editCust' && editingCustId != null) {
        const c = customers.find(x => String(x.id) === String(editingCustId));
        if (c) {
            c.geofence_radius = radius;
            targetKey = makeTargetGeoKey(c.name, c.address);
        }
    }

    const mapRadEl = document.getElementById('yardMapGeofenceRadius');
    const mapRadValEl = document.getElementById('yardMapGeofenceRadiusVal');
    if (targetKey === currentMapTargetKey) {
        if (mapRadEl) mapRadEl.value = radius;
        if (mapRadValEl) mapRadValEl.textContent = radius;
    }
    renderYardGeofenceCircle(radius, targetKey);
}
window.previewGeofenceRadiusFromDialog = previewGeofenceRadiusFromDialog;

function renderTargetGeoJSONOnMap(key, centerMap = true) {
    if (!yardMap || !yardDrawnItems) return;
    selectedMapLayer = null;
    yardDrawnItems.clearLayers();
    const activeKey = key || 'default_yard';

    syncYardMapGeofenceControls(activeKey);
    renderNeighborCardsOnMap(activeKey);
    renderYardGeofenceCircle(null, activeKey);

    const activeTarget = resolveMapTargetObject(activeKey);
    const markerLat = activeTarget?.lat || activeTarget?.taskRef?.lat || activeTarget?.custRef?.lat || null;
    const markerLon = activeTarget?.lon || activeTarget?.taskRef?.lon || activeTarget?.custRef?.lon || null;
    if (markerLat && markerLon && yardMap) {
        const canDrag = (activePinMovingTaskId != null) || (isPinDropModeActive && (pinDropTargetContext === 'addTask' || pinDropTargetContext === 'editTask'));
        if (!yardPinDropMarker) {
            yardPinDropMarker = L.marker([markerLat, markerLon], {
                draggable: canDrag,
                icon: getPinDropIcon(canDrag),
                zIndexOffset: 1200,
                pmIgnore: true
            }).addTo(yardMap);

            yardPinDropMarker.on('dragend', e => {
                const canMove = (activePinMovingTaskId != null) || (isPinDropModeActive && (pinDropTargetContext === 'addTask' || pinDropTargetContext === 'editTask'));
                if (canMove) {
                    const pos = e.target.getLatLng();
                    applyPinDropCoordinates(pos.lat, pos.lng, true);
                }
            });
        } else {
            yardPinDropMarker.setLatLng([markerLat, markerLon]);
            yardPinDropMarker.setIcon(getPinDropIcon(canDrag));
            if (yardPinDropMarker.dragging) {
                if (canDrag) yardPinDropMarker.dragging.enable();
                else yardPinDropMarker.dragging.disable();
            }
            if (!yardMap.hasLayer(yardPinDropMarker)) yardPinDropMarker.addTo(yardMap);
        }
    }

    const geoData = getSavedGeoJSONForTarget(activeKey);
    if (geoData && Array.isArray(geoData.features) && geoData.features.length > 0) {
        geoData.features.forEach(feature => {
            const catKey = feature?.properties?.category || (feature?.geometry?.type === 'Point' ? 'snowdump' : 'machine');
            let layer = null;

            // Jos vanhassa tallennuksessa lumenkaatopaikka oli piste (Point), muunnetaan se käännettäväksi ja kokoa muutettavaksi laatikoksi
            if (feature.geometry && feature.geometry.type === 'Point') {
                const [lng, lat] = feature.geometry.coordinates;
                layer = L.polygon(pointToBoxLatLngs(lat, lng));
            } else {
                const tmp = L.geoJSON(feature);
                tmp.eachLayer(l => { if (!layer) layer = l; });
            }

            if (layer) {
                applyLayerCategoryStyle(layer, catKey, activeKey);
                attachLayerEvents(layer);
                yardDrawnItems.addLayer(layer);
            }
        });

        renderYardGeofenceCircle(null, activeKey);
        setYardMapStatus(`Ladattu ${geoData.features.length} tallennettua aluetta kohteelle.`);
        if (centerMap) {
            try {
                const b = yardDrawnItems.getBounds();
                if (b && b.isValid()) {
                    yardMap.fitBounds(b, { maxZoom: 19, padding: [30, 30] });
                    return;
                }
            } catch (e) {}
        }
    } else {
        setYardMapStatus('Ei vielä piirrettyjä alueita tälle kohteelle. Valitse alta Konealue, Käsityöalue tai Lumenkaatoalue.');
    }

    if (centerMap) {
        centerMapOnTarget(activeKey);
    }
}

async function centerMapOnTarget(key) {
    if (!yardMap) return;
    const target = resolveMapTargetObject(key);
    if (!target) {
        renderYardGeofenceCircle(null, key);
        return;
    }

    if (target.lat && target.lon) {
        yardMap.flyTo([target.lat, target.lon], 18, { duration: 1.2 });
        renderYardGeofenceCircle(null, key);
        return;
    }
    if (target.taskRef && target.taskRef.lat && target.taskRef.lon) {
        yardMap.flyTo([target.taskRef.lat, target.taskRef.lon], 18, { duration: 1.2 });
        renderYardGeofenceCircle(null, key);
        return;
    }

    if (target.address) {
        const c = await fetchCoordinates(target.address);
        if (c && c.lat && c.lon) {
            target.lat = c.lat;
            target.lon = c.lon;
            if (target.taskRef) {
                target.taskRef.lat = c.lat;
                target.taskRef.lon = c.lon;
                localStorage.setItem('pihatyot_tasks_v4', JSON.stringify(tasks));
            }
            if (target.custRef) {
                target.custRef.lat = c.lat;
                target.custRef.lon = c.lon;
                localStorage.setItem('pihatyot_customers_v1', JSON.stringify(customers));
            }
            if (currentMapTargetKey === target.key) {
                yardMap.flyTo([c.lat, c.lon], 18, { duration: 1.2 });
                renderYardGeofenceCircle(null, target.key);
            }
        }
    }
}

function selectYardMapTarget(key) {
    currentMapTargetKey = key || 'default_yard';
    localStorage.setItem(YARD_ACTIVE_TARGET_KEY, currentMapTargetKey);
    const sel = document.getElementById('yardMapTargetSelect');
    if (sel && sel.value !== currentMapTargetKey) sel.value = currentMapTargetKey;
    syncYardMapGeofenceControls(currentMapTargetKey);
    renderTargetGeoJSONOnMap(currentMapTargetKey, true);
}

function openTaskOnYardMap(taskId) {
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;
    const key = makeTargetGeoKey(t.name, t.address);
    switchTab('routes');
    refreshYardMapTargetSelect();
    selectYardMapTarget(key);
    const card = document.getElementById('yardMapCard');
    if (card) {
        setTimeout(() => {
            if (yardMap) yardMap.invalidateSize();
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function openCustomerOnYardMap(custId) {
    const c = customers.find(x => String(x.id) === String(custId));
    if (!c) return;
    const key = makeTargetGeoKey(c.name, c.address);
    switchTab('routes');
    refreshYardMapTargetSelect();
    selectYardMapTarget(key);
    const card = document.getElementById('yardMapCard');
    if (card) {
        setTimeout(() => {
            if (yardMap) yardMap.invalidateSize();
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function clearToolbarActiveStates() {
    ['btnDrawMachine', 'btnDrawManual', 'btnDrawSnowdump', 'btnDeleteSelectedArea'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
}

function startYardDraw(category) {
    if (!yardMap || !yardMap.pm) return;
    if (currentAppMode !== 'admin') {
        alert('Kytke yläpalkista "🛠️ Hallintatila" piirtääksesi tai muokataksesi alueita.');
        return;
    }
    if (isPinDropModeActive) disableMapPinDropMode();
    currentDrawCategory = category;
    const cat = YARD_CATEGORIES[category] || YARD_CATEGORIES.machine;

    clearToolbarActiveStates();
    if (category === 'machine') document.getElementById('btnDrawMachine')?.classList.add('active');
    if (category === 'manual') document.getElementById('btnDrawManual')?.classList.add('active');
    if (category === 'snowdump') document.getElementById('btnDrawSnowdump')?.classList.add('active');

    yardMap.pm.disableGlobalRemovalMode();
    yardMap.pm.disableGlobalEditMode();
    if (typeof yardMap.pm.disableGlobalRotateMode === 'function') yardMap.pm.disableGlobalRotateMode();
    yardMap.pm.disableDraw();

    // Lumenkaatoalue piirretään oletuksena suorakulmiona (Rectangle), jota voi vapaasti skaalata ja pyörittää
    const shapeType = category === 'snowdump' ? 'Rectangle' : 'Polygon';
    yardMap.pm.enableDraw(shapeType, {
        snappable: true,
        snapDistance: 15,
        allowSelfIntersection: false,
        templineStyle: { color: cat.color, weight: 3 },
        hintlineStyle: { color: cat.color, dashArray: [5, 5] },
        pathOptions: {
            color: cat.color,
            weight: cat.weight,
            fillColor: cat.fillColor,
            fillOpacity: cat.fillOpacity
        }
    });

    if (category === 'snowdump') {
        setYardMapStatus('❄️ Lumenkaatoalue: klikkaa laatikon kulmat kartalle. Voit sen jälkeen siirtää, kääntää ja muuttaa kokoa suoraan valintakahvoista.');
    } else {
        setYardMapStatus(`${cat.label}: klikkaa alueen kulmapisteet kartalle ja sulje alue klikkaamalla aloitukseen. Muokkaa klikkaamalla aluetta.`);
    }
}

// Yhteensopivuusfunktiot mahdollisille aiemmille kutsuille
function toggleYardEditMode() {
    if (selectedMapLayer) selectMapLayer(selectedMapLayer);
}
function toggleYardRotateMode() {
    if (selectedMapLayer) selectMapLayer(selectedMapLayer);
}

function deleteSelectedYardFeature() {
    if (!yardMap || !yardDrawnItems) return;
    if (currentAppMode !== 'admin') {
        alert('Kytke yläpalkista "🛠️ Hallintatila" poistaaksesi alueita.');
        return;
    }
    if (isPinDropModeActive) disableMapPinDropMode();
    if (selectedMapLayer && yardDrawnItems.hasLayer(selectedMapLayer)) {
        if (selectedMapLayer.transform && selectedMapLayer.transform._enabled) {
            selectedMapLayer.transform.disable();
        }
        if (selectedMapLayer.pm && typeof selectedMapLayer.pm.enabled === 'function' && selectedMapLayer.pm.enabled()) {
            selectedMapLayer.pm.disable();
        }
        yardDrawnItems.removeLayer(selectedMapLayer);
        yardMap.removeLayer(selectedMapLayer);
        selectedMapLayer = null;
        saveCurrentTargetGeoJSON();
        setYardMapStatus('Valittu alue poistettu ja muutos tallennettu.');
        return;
    }
    if (yardMap.pm) {
        yardMap.pm.disableDraw();
        yardMap.pm.disableGlobalEditMode();
        if (typeof yardMap.pm.disableGlobalRotateMode === 'function') yardMap.pm.disableGlobalRotateMode();
        yardMap.pm.toggleGlobalRemovalMode();
        const isRemoving = yardMap.pm.globalRemovalModeEnabled();
        clearToolbarActiveStates();
        document.getElementById('btnDeleteSelectedArea')?.classList.toggle('active', isRemoving);
        setYardMapStatus(isRemoving
            ? '🗑️ Poistotila päällä: klikkaa kartalta aluetta poistaaksesi sen.'
            : 'Poistotila suljettu.');
    }
}

function clearCurrentTargetMap() {
    if (!yardDrawnItems) return;
    if (currentAppMode !== 'admin') {
        alert('Kytke yläpalkista "🛠️ Hallintatila" tyhjentääksesi kartan.');
        return;
    }
    const count = yardDrawnItems.getLayers().length;
    if (count === 0) {
        setYardMapStatus('Kartalla ei ole poistettavia alueita.');
        return;
    }
    if (!confirm('Haluatko varmasti tyhjentää kaikki tämän kohteen piirretyt alueet ja lumenkaatopaikat?')) {
        return;
    }
    if (selectedMapLayer) {
        if (selectedMapLayer.transform && selectedMapLayer.transform._enabled) {
            selectedMapLayer.transform.disable();
        }
        if (selectedMapLayer.pm && typeof selectedMapLayer.pm.enabled === 'function' && selectedMapLayer.pm.enabled()) {
            selectedMapLayer.pm.disable();
        }
    }
    yardDrawnItems.clearLayers();
    selectedMapLayer = null;
    saveCurrentTargetGeoJSON();
    setYardMapStatus('Kohteen kartta tyhjennetty.');
}

function initYardSatelliteMap() {
    const mapEl = document.getElementById('yardSatelliteMap');
    if (!mapEl || typeof L === 'undefined') return;

    const initLat = (depot && depot.lat) ? depot.lat : 61.4978;
    const initLon = (depot && depot.lon) ? depot.lon : 23.7610;

    yardMap = L.map('yardSatelliteMap', {
        center: [initLat, initLon],
        zoom: 18,
        maxZoom: 21
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 19,
        maxZoom: 21,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 21,
        attribution: '&copy; OpenStreetMap contributors'
    });

    satelliteLayer.addTo(yardMap);
    L.control.layers({
        '🛰️ Satelliitti': satelliteLayer,
        '🗺️ Normaali kartta': streetLayer
    }, null, { position: 'topright' }).addTo(yardMap);

    yardNeighborItems = new L.FeatureGroup();
    yardMap.addLayer(yardNeighborItems);

    yardDrawnItems = new L.FeatureGroup();
    yardMap.addLayer(yardDrawnItems);

    if (yardMap.pm) {
        yardMap.pm.addControls({
            position: 'topleft',
            drawCircle: false,
            drawCircleMarker: false,
            drawRectangle: true,
            drawPolyline: false,
            drawText: false,
            drawPolygon: true,
            drawMarker: false,
            editMode: true,
            dragMode: true,
            rotateMode: true,
            cutPolygon: false,
            removalMode: true
        });

        yardMap.on('pm:create', e => {
            let layer = e.layer;
            let cat = currentDrawCategory || 'machine';
            const activeKey = currentMapTargetKey || 'default_yard';

            if (e.shape === 'Marker' && typeof layer.getLatLng === 'function') {
                const pt = layer.getLatLng();
                yardMap.removeLayer(layer);
                layer = L.polygon(pointToBoxLatLngs(pt.lat, pt.lng));
                cat = 'snowdump';
            }

            applyLayerCategoryStyle(layer, cat, activeKey);
            attachLayerEvents(layer);
            yardDrawnItems.addLayer(layer);

            // Yhdistetään automaattisesti vierekkäiset saman kategorian alueet (vain saman osoitekortin sisällä!)
            const finalLayer = tryMergeAdjacentSameCategory(layer);
            selectMapLayer(finalLayer);
            saveCurrentTargetGeoJSON();

            clearToolbarActiveStates();
        });

        yardMap.on('pm:remove', e => {
            if (yardDrawnItems.hasLayer(e.layer)) {
                yardDrawnItems.removeLayer(e.layer);
            }
            if (selectedMapLayer === e.layer) {
                selectedMapLayer = null;
            }
            saveCurrentTargetGeoJSON();
            setYardMapStatus('Alue poistettu ja tallennettu.');
        });
    }

    yardMap.on('click', e => {
        const canMove = (activePinMovingTaskId != null) || (isPinDropModeActive && (pinDropTargetContext === 'addTask' || pinDropTargetContext === 'editTask'));
        if (canMove && e.latlng) {
            applyPinDropCoordinates(e.latlng.lat, e.latlng.lng, true);
            return;
        }
        if (selectedMapLayer) {
            if (selectedMapLayer.transform && selectedMapLayer.transform._enabled) {
                selectedMapLayer.transform.disable();
            }
            if (selectedMapLayer.pm && typeof selectedMapLayer.pm.enabled === 'function' && selectedMapLayer.pm.enabled()) {
                selectedMapLayer.pm.disable();
            }
            if (typeof selectedMapLayer.setStyle === 'function') {
                const prevCat = YARD_CATEGORIES[selectedMapLayer._yardCategory] || YARD_CATEGORIES.machine;
                selectedMapLayer.setStyle({ weight: prevCat.weight, dashArray: null });
            }
            saveCurrentTargetGeoJSON();
            selectedMapLayer = null;
            setYardMapStatus('Alueen muokkaus suljettu ja koordinaatit tallennettu.');
        }
    });

    window.addEventListener('resize', () => {
        if (yardMap) {
            yardMap.invalidateSize();
        }
    });

    refreshYardMapTargetSelect();
    renderTargetGeoJSONOnMap(currentMapTargetKey, true);
}
