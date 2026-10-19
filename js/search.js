// ============================================================
// YardFlow - Sivupalkin kohdehaku, suodatus ja kohdelistan DOM-renderöinti (js/search.js)
// ============================================================

function handlePropertySearch(val) {
    propertySearchQuery = (val || '').trim().toLowerCase();
    const clearBtn = document.getElementById('property-search-clear');
    const hint = document.getElementById('search-filter-hint');
    if (clearBtn) clearBtn.style.display = propertySearchQuery ? 'block' : 'none';
    if (hint) hint.style.display = propertySearchQuery ? 'inline' : 'none';
    renderTasks();
}
window.handlePropertySearch = handlePropertySearch;

function clearPropertySearch() {
    propertySearchQuery = '';
    const input = document.getElementById('property-search-input');
    const clearBtn = document.getElementById('property-search-clear');
    const hint = document.getElementById('search-filter-hint');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (hint) hint.style.display = 'none';
    renderTasks();
}
window.clearPropertySearch = clearPropertySearch;

function selectActiveProperty(taskId, flyTo = true) {
    if (activePinMovingTaskId != null && activePinMovingTaskId !== taskId) {
        activePinMovingTaskId = null;
        isPinDropModeActive = false;
        pinDropTargetContext = null;
        updatePinMarkerDraggableState();
    }
    activeSelectedTaskId = taskId;
    document.querySelectorAll('#taskList .task-item').forEach(el => {
        el.classList.remove('active-property');
        el.classList.remove('active');
    });
    const card = document.querySelector(`#taskList [data-task-id="${taskId}"]`);
    if (card) {
        card.classList.add('active-property');
        card.classList.add('active');
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const key = makeTargetGeoKey(task.name, task.address);
    selectYardMapTarget(key);

    if (flyTo && yardMap && task.lat && task.lon) {
        yardMap.flyTo([task.lat, task.lon], 18, { duration: 1.2 });
    } else if (flyTo && yardMap && task.address) {
        centerMapOnTarget(key);
    }
}
window.selectActiveProperty = selectActiveProperty;

function renderTasks() {
    const listEl = document.getElementById('taskList');
    listEl.innerHTML = '';

    const pending = tasks.filter(t => !t.done);
    document.getElementById('taskCount').textContent = `${pending.length} jäljellä / ${tasks.length} yht.`;
    updateDistanceSummary(pending);
    renderActiveRoute();
    updateDashboardWidgets();

    const searchCountEl = document.getElementById('search-count');

    if (tasks.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Ei vielä kohteita ajolistalla. Paina yltä "➕ Lisää kohde" tai poimi asiakas Asiakkaat-välilehdeltä!</p>';
        if (searchCountEl) searchCountEl.textContent = '0 kohdetta';
        updateDashboardWidgets();
        return;
    }

    const searchMatches = tasks.filter(task => {
        if (!propertySearchQuery) return true;
        const n = (task.name || '').toLowerCase();
        const a = (task.address || '').toLowerCase();
        return n.includes(propertySearchQuery) || a.includes(propertySearchQuery);
    });

    if (searchCountEl) {
        searchCountEl.textContent = propertySearchQuery
            ? `${searchMatches.length} / ${tasks.length} kohdetta`
            : `${tasks.length} kohdetta`;
    }

    if (propertySearchQuery && searchMatches.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Ei hakua vastaavia kohteita. Kokeile toista hakusanaa tai tyhjennä haku.</p>';
        if (typeof refreshYardMapTargetSelect === 'function') refreshYardMapTargetSelect();
        return;
    }

    let shown = 0;
    tasks.forEach((task, index) => {
        normalizeGeofenceFields(task);
        if (currentFilter === 'pending' && task.done) return;
        if (currentFilter === 'done' && !task.done) return;
        if (propertySearchQuery && !searchMatches.includes(task)) return;
        shown++;

        const isBlocked = !!task.blocked;
        const isManualOverride = !!(task.done && (task.manual_override || task.manager_alert));
        const isVerifiedOnSite = !!(task.done && task.verified_on_site && !isManualOverride);
        const isActive = activeSelectedTaskId === task.id;
        const isMovingThisPin = activePinMovingTaskId === task.id;

        const item = document.createElement('div');
        item.className = `task-item yard-card ${task.done ? 'done' : ''} ${isManualOverride ? 'manual-override-card' : ''} ${isBlocked ? 'is-blocked' : ''} ${isActive ? 'active-property active' : ''}`;
        item.setAttribute('data-task-id', task.id);
        item.onclick = (e) => {
            if (!e.target.closest('button, a, input, select, textarea, .coord-badge, .coord-missing')) {
                selectActiveProperty(task.id, true);
            }
        };

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(taskRef(task))}`;

        let headerBadge = '';
        if (isBlocked) {
            headerBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.22); color: #f43f5e; border: 1px solid rgba(239, 68, 68, 0.5);" title="Kohteeseen ei päästy: ${esc(task.blocked_reason || '')}">🚫 Ei päästy tekemään</span>`;
        } else if (isManualOverride) {
            const reasonTip = task.override_reason ? `Kuskin perustelu: ${task.override_reason}` : 'Kuitattu manuaalisesti geofence-alueen ulkopuolelta';
            headerBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.22); color: var(--accent-amber); border: 1px solid rgba(245, 158, 11, 0.5);" title="${esc(reasonTip)}">⚠️ Kuitattu manuaalisesti</span>`;
        } else if (task.done) {
            headerBadge = `<span class="badge badge-done">✓ Valmis</span>`;
        } else {
            headerBadge = `<span class="badge badge-active">${esc(task.type)}</span>`;
        }

        let locPill = '';
        if (!task.lat || !task.lon) {
            locPill = `<span class="coord-missing" onclick="clearTaskCoords(${task.id})" style="cursor:pointer;" title="Klikkaa hakeaksesi osoitteen sijainnin uudelleen">⚠️ Ei sijaintia ↻</span>`;
        } else if (task.gps) {
            locPill = `<span class="coord-badge" title="Tallennettu GPS-piste">📍 GPS</span>`;
        }

        const gfModeLabel = task.geofence_enabled === false
            ? 'Pois'
            : (task.geofence_type === 'polygon' ? 'Karttaraja' : `${task.geofence_radius || 80} m`);
        const gfPill = `<span class="coord-badge" style="cursor:pointer;" onclick="openTaskOnYardMap(${task.id})" title="Kohteen paikkatodennus (Geofence) — klikkaa muokataksesi sädettä tai rajoja">🛰️ Geofence: ${esc(gfModeLabel)}</span>`;

        let verificationBannerHtml = '';
        if (isBlocked) {
            const distStr = task.blocked_distance_meters != null ? ` · Etäisyys kohteesta: ${task.blocked_distance_meters} m` : '';
            const timeStr = task.blocked_at ? ` · ${fmtDateTime(task.blocked_at)}` : '';
            const reasonStr = task.blocked_reason || 'Ei eritelty';
            verificationBannerHtml = `
                <div class="blocked-alert-banner" title="Työnjohdon huomioliputus — Este kohteessa">
                    <span class="alert-icon" style="font-size: 1.15rem;">🚫</span>
                    <div style="flex: 1;">
                        <div class="alert-title" style="font-weight: 700; color: #f43f5e;">Ilmoitus työnjohdolle: Ei päästy tekemään kohdetta</div>
                        <div style="margin-top: 2px;"><b>Syy:</b> ${esc(reasonStr)}${esc(distStr)}${esc(timeStr)}</div>
                    </div>
                    <button type="button" class="tiny-btn" onclick="openTaskObstacleModal(${task.id})" style="align-self: center;" title="Muokkaa esteen tietoja tai poista este">Muokkaa</button>
                </div>
            `;
        } else if (isManualOverride) {
            const distStr = task.override_distance_meters != null ? ` · Etäisyys kohteesta: ${task.override_distance_meters} m` : '';
            const timeStr = (task.completed_at || task.completedAt) ? ` · ${fmtDateTime(task.completed_at || task.completedAt)}` : '';
            const reasonStr = task.override_reason || 'Ei ilmoitettua syytä';
            verificationBannerHtml = `
                <div class="manager-alert-banner" title="Työnjohdon huomioliputus — Kuskin perustelu: ${esc(reasonStr)}${esc(distStr)}">
                    <span class="alert-icon">⚠️</span>
                    <div>
                        <div class="alert-title">Huomio työnjohdolle: Manuaalinen kuittaus (Geofence-ohitus)</div>
                        <div><b>Kuskin syy:</b> ${esc(reasonStr)}${esc(distStr)}${esc(timeStr)}</div>
                    </div>
                </div>
            `;
        } else if (isVerifiedOnSite) {
            const distStr = task.override_distance_meters != null ? ` (${task.override_distance_meters} m)` : '';
            verificationBannerHtml = `<div style="margin-bottom: 10px;"><span class="geofence-verified-pill" title="Paikkatodennus vahvistettu kohteessa">🛰️ Paikkatodennus OK ✓${esc(distStr)}</span></div>`;
        }

        let completeBtnClass = 'btn-complete-main';
        let completeBtnText = '✓ Kuittaa valmiiksi';
        if (isManualOverride) {
            completeBtnClass = 'btn-complete-main is-manual-override';
            completeBtnText = 'Kuitattu manuaalisesti ⚠️';
        } else if (task.done) {
            completeBtnClass = 'btn-complete-main is-done';
            completeBtnText = 'Kuitattu valmiiksi ✓';
        }

        item.innerHTML = `
            <div class="task-header">
                <span class="task-title yard-title" style="margin-bottom: 0;">${shown}. ${esc(task.name)}</span>
                ${headerBadge}
            </div>

            <div class="task-address-row">
                <a href="${mapsUrl}" target="_blank" rel="noopener" class="yard-address">📍 ${esc(task.address)}</a>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    ${locPill}
                    ${gfPill}
                    ${task.phone ? `<a href="tel:${esc(task.phone)}" class="contact-link" title="Soita asiakkaalle">📞 ${esc(task.phone)}</a>` : ''}
                </div>
            </div>

            ${approxLocation(task) ? `<div class="task-warn">ℹ️ Sijainti kadun tarkkuudella (voit halutessasi tallentaa tarkan 📍 GPS-pisteen kohteessa).</div>` : ''}
            ${task.notes ? `<div class="task-notes">⚠️ ${esc(task.notes)}</div>` : ''}
            ${verificationBannerHtml}

            ${isMovingThisPin ? `
            <div style="background: rgba(245, 158, 11, 0.16); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.82rem; color: var(--accent-amber); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span>📍 <b>Sijainti avattu siirrettäväksi:</b> Klikkaa kartalta uusi kohta tai raahaa merkkiä.</span>
                <button type="button" class="tiny-btn" style="background: var(--accent-amber); color: #000; font-weight: 700; white-space: nowrap; padding: 4px 10px; margin: 0;" onclick="toggleMoveCardPin(${task.id}, event)">Valmis ✓</button>
            </div>
            ` : ''}

            <div class="task-action-row">
                <button type="button" class="${completeBtnClass}" onclick="handleCompleteTaskClick(${task.id}, this)" title="${task.done ? 'Klikkaa palauttaaksesi kohteen tekemättömäksi' : 'Tarkistaa GPS-sijainnin ja kuittaa pihan valmiiksi'}">
                    ${isBlocked ? '✓ Kuittaa valmiiksi (este poistunut)' : completeBtnText}
                </button>
                ${!task.done ? `
                <button type="button" class="btn-obstacle-action ${isBlocked ? 'is-blocked' : ''}" onclick="openTaskObstacleModal(${task.id})" title="${isBlocked ? 'Muokkaa esteen syytä tai palauta normaaliksi' : 'Ilmoita este tai syy, miksi kohdetta ei päästä tekemään'}">
                    ${isBlocked ? '🚫 Estynyt ✎' : '🚫 Ei pääse'}
                </button>
                ` : ''}
            </div>

            <div class="task-tools-row">
                <div class="task-tools-group admin-only">
                    <button class="order-btn" title="Siirrä ylöspäin" onclick="moveTask(${index}, -1)" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="order-btn" title="Siirrä alaspäin" onclick="moveTask(${index}, 1)" ${index === tasks.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="task-tools-group">
                    <button class="tiny-btn" type="button" onclick="openTaskOnYardMap(${task.id})" title="Avaa satelliittikartta ja piirrä kone-/käsityöalueet sekä geofence-ympyrä">🛰️ Pihakartta</button>
                    <button class="tiny-btn admin-only ${isMovingThisPin ? 'active' : ''}" style="${isMovingThisPin ? 'background: var(--accent-amber); color: #000; font-weight: 700; border-color: var(--accent-amber);' : ''}" type="button" onclick="toggleMoveCardPin(${task.id}, event)" title="${isMovingThisPin ? 'Tallenna ja lukitse kohteen sijainti' : 'Siirrä tämän kohteen sijaintipistettä kartalla'}">${isMovingThisPin ? '✓ Sijainti OK' : '📍 Siirrä sijaintia'}</button>
                    <button class="tiny-btn" type="button" onclick="openStreetViewForTask(${task.id})" title="Avaa kohde Google Street View -katunäkymässä">🛣️ Avaa Street View</button>
                    <button class="tiny-btn" type="button" onclick="quickSnapPhoto(${task.id})" title="Ota valokuva kohteesta">📷 Ota kuva</button>
                    <button class="photo-btn" type="button" onclick="openCustomerPhotos(${task.customerId ? task.customerId : `'${esc(task.name)}'`})" title="Näytä kohteen valokuvat">🖼️ <span data-photo-count-for="${task.customerId || esc(task.name)}">${photoCounts[String(task.customerId || task.name)] || 0}</span></button>
                    <button class="tiny-btn admin-only" type="button" onclick="setTaskGPS(${task.id})" title="Tallenna nykyinen GPS-sijaintisi tämän kohteen sijainniksi">📍 GPS</button>
                    <button class="tiny-btn admin-only" type="button" onclick="editTask(${task.id})" title="Muokkaa kohteen tietoja ja geofence-asetuksia">✎</button>
                    <button class="tiny-btn danger admin-only" type="button" onclick="deleteTask(${task.id})" title="Poista kohde ajolistalta">✕</button>
                </div>
            </div>
        `;
        listEl.appendChild(item);
    });
    if (typeof refreshYardMapTargetSelect === 'function') refreshYardMapTargetSelect();
}
