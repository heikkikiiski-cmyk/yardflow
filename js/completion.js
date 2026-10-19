// ============================================================
// YardFlow - Geofencing-kuittaus, manuaalikuittaus (override), esteilmoitukset ja manager_alert (js/completion.js)
// ============================================================

// ============================================================
// 🛰️ GEOFENCING (PROOF OF PRESENCE) & MANUAALIKUITTAUS (OVERRIDE)
// ============================================================

// 4. Kuittauspainikkeen työnkulku & Manuaalikuittaus (Override)
let pendingOverrideTaskId = null;
let pendingOverrideDistanceMeters = null;

function completeTaskVerified(task, distanceMeters) {
    const nowIso = new Date().toISOString();
    task.done = true;
    task.completed = true;
    task.blocked = false;
    task.blocked_reason = null;
    task.blocked_at = null;
    task.blocked_distance_meters = null;
    task.verified_on_site = true;
    task.manual_override = false;
    task.override_reason = null;
    task.override_distance_meters = (distanceMeters != null && !isNaN(distanceMeters)) ? Math.round(distanceMeters) : 0;
    task.completed_at = nowIso;
    task.completedAt = nowIso;
    task.manager_alert = false;

    // Päivitetään myös asiakaskortin viimeisin tila
    const cust = customers.find(c =>
        (task.customerId && String(c.id) === String(task.customerId)) ||
        (c.name && task.name && c.name.toLowerCase() === task.name.toLowerCase())
    );
    if (cust) {
        cust.manager_alert = false;
        cust.manual_override = false;
        cust.override_reason = null;
        cust.override_distance_meters = task.override_distance_meters;
        persistCustomers();
    }

    addWorkLogEntry({
        id: newId(),
        timestamp: nowIso,
        completed_at: nowIso,
        customerId: task.customerId || (cust ? cust.id : null),
        customerName: task.name,
        address: task.address,
        type: task.type || 'Auraus & Hiekoitus',
        sepeliQty: 0,
        notes: task.notes || '',
        contractType: task.contractType || '',
        paymentMethod: task.paymentMethod || '',
        completed: true,
        verified_on_site: true,
        manual_override: false,
        override_reason: null,
        override_distance_meters: task.override_distance_meters,
        manager_alert: false
    });

    saveAndRender();
    if (document.getElementById('viewCustomers').style.display !== 'none') renderCustomers();
    const distInfo = task.override_distance_meters != null ? ` (etäisyys ${task.override_distance_meters} m)` : '';
    showStatus(`🛰️ Paikkatodennus onnistui! "${esc(task.name)}" kuitattu valmiiksi ✓${distInfo}.`, 'success');
}

async function handleCompleteTaskClick(id, btnEl) {
    const t = tasks.find(x => String(x.id) === String(id));
    if (!t) return;
    normalizeGeofenceFields(t);

    // Jos kohde on jo kuitattu valmiiksi, tarjotaan palautusta tekemättömäksi
    if (t.done) {
        if (!confirm(`Palautetaanko kohde "${t.name}" takaisin tilaan "Tekemättä"?`)) return;
        t.done = false;
        t.completed = false;
        t.verified_on_site = false;
        t.manual_override = false;
        t.override_reason = null;
        t.override_distance_meters = null;
        t.completed_at = null;
        t.completedAt = null;
        t.manager_alert = false;
        saveAndRender();
        showStatus(`Kohde "${esc(t.name)}" palautettu tekemättömäksi.`, 'info');
        return;
    }

    // Estä tuplaklikkaukset ja aseta painikkeen tekstiksi "Tarkistetaan sijaintia... 🛰️"
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.classList.add('is-checking');
        btnEl.textContent = 'Tarkistetaan sijaintia... 🛰️';
    }

    // Jos paikkatodennus on kytketty pois päältä tälle kohteelle, sallitaan heti
    if (t.geofence_enabled === false) {
        completeTaskVerified(t, 0);
        return;
    }

    // Jos kohteelta puuttuu vielä koordinaatit, yritetään geokoodata osoite ennen etäisyystarkistusta
    if ((!t.lat || !t.lon) && t.address) {
        try {
            const coords = await fetchCoordinates(t.address);
            if (coords && coords.lat && coords.lon) {
                t.lat = coords.lat;
                t.lon = coords.lon;
                t.geoName = coords.name || '';
            }
        } catch (e) {}
    }

    if (!navigator.geolocation) {
        openGeofenceOverrideModal(t.id, null, 'Laitteen GPS-paikannus ei ole käytettävissä.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const driverLat = pos.coords.latitude;
            const driverLng = pos.coords.longitude;
            const check = isDriverAtProperty(driverLat, driverLng, t, 50);

            if (check.allowed) {
                completeTaskVerified(t, check.distanceMeters);
            } else {
                const reasonMsg = check.distanceMeters != null
                    ? `Etäisyys kohteeseen: ${check.distanceMeters} m (sallittu raja: ${check.maxAllowedMeters} m sis. 50 m GPS-toleranssin)`
                    : 'Kohteen tarkkoja karttakoordinaatteja ei voitu varmentaa automaattisesti.';
                openGeofenceOverrideModal(t.id, check.distanceMeters, reasonMsg);
            }
        },
        err => {
            let errText = 'GPS-sijaintia ei saatu paikannettua (aikakatkaisu tai estetty).';
            if (err && err.code === 1) errText = 'GPS-sijaintilupa on estetty selaimessa.';
            else if (err && err.code === 3) errText = 'GPS-paikannus aikakatkaistiin (7 s).';
            openGeofenceOverrideModal(t.id, null, errText);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
}
window.handleCompleteTaskClick = handleCompleteTaskClick;

// Säilytetään toggleTask-funktio yhteensopivuuden vuoksi ja ohjataan se uuteen geofence-työnkulkuun
function toggleTask(id, btnEl) {
    return handleCompleteTaskClick(id, btnEl);
}

function openGeofenceOverrideModal(taskId, distanceMeters, statusText) {
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) {
        renderTasks();
        return;
    }
    pendingOverrideTaskId = t.id;
    pendingOverrideDistanceMeters = (distanceMeters != null && !isNaN(distanceMeters)) ? Math.round(Number(distanceMeters)) : null;

    const targetInfoEl = document.getElementById('geofenceOverrideTargetInfo');
    if (targetInfoEl) {
        targetInfoEl.textContent = `Kohde: ${t.name} (${t.address})`;
    }
    const distInfoEl = document.getElementById('geofenceOverrideDistanceInfo');
    if (distInfoEl) {
        if (statusText) {
            distInfoEl.textContent = statusText;
        } else if (pendingOverrideDistanceMeters != null) {
            distInfoEl.textContent = `Mitattu etäisyys kohteesta: ${pendingOverrideDistanceMeters} m (säde ${t.geofence_radius || 80} m + 50 m GPS-toleranssi)`;
        } else {
            distInfoEl.textContent = 'GPS-sijaintia ei saatu vahvistettua kohteessa.';
        }
    }

    // Nollataan radiovalinnat ja tekstikenttä; Vahvista-painike on disabloitu kunnes syy valitaan
    document.querySelectorAll('input[name="geofenceOverrideReason"]').forEach(r => { r.checked = false; });
    const customBox = document.getElementById('geofenceOverrideCustomBox');
    const customInput = document.getElementById('geofenceOverrideCustomReason');
    if (customBox) customBox.style.display = 'none';
    if (customInput) customInput.value = '';
    const confirmBtn = document.getElementById('btnConfirmGeofenceOverride');
    if (confirmBtn) confirmBtn.disabled = true;

    const dlg = document.getElementById('geofenceOverrideDialog');
    if (dlg && typeof dlg.showModal === 'function') {
        dlg.showModal();
    }
}
window.openGeofenceOverrideModal = openGeofenceOverrideModal;

function updateGeofenceOverrideModalState() {
    const selected = document.querySelector('input[name="geofenceOverrideReason"]:checked')?.value || '';
    const customBox = document.getElementById('geofenceOverrideCustomBox');
    const customInput = document.getElementById('geofenceOverrideCustomReason');
    const confirmBtn = document.getElementById('btnConfirmGeofenceOverride');

    if (selected === 'Muu syy') {
        if (customBox) customBox.style.display = 'block';
        const hasCustomText = !!(customInput && customInput.value.trim().length > 0);
        if (confirmBtn) confirmBtn.disabled = !hasCustomText;
    } else if (selected) {
        if (customBox) customBox.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = false;
    } else {
        if (customBox) customBox.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = true;
    }
}
window.updateGeofenceOverrideModalState = updateGeofenceOverrideModalState;

function cancelGeofenceManualOverride() {
    pendingOverrideTaskId = null;
    pendingOverrideDistanceMeters = null;
    const dlg = document.getElementById('geofenceOverrideDialog');
    if (dlg) dlg.close('cancel');
    renderTasks();
}
window.cancelGeofenceManualOverride = cancelGeofenceManualOverride;

function confirmGeofenceManualOverride() {
    const selected = document.querySelector('input[name="geofenceOverrideReason"]:checked')?.value || '';
    if (!selected) return;

    const customInput = document.getElementById('geofenceOverrideCustomReason');
    let finalReason = selected;
    if (selected === 'Muu syy') {
        const customText = customInput ? customInput.value.trim() : '';
        if (!customText) {
            alert('Kirjoita perustelu "Muu syy" -kenttään!');
            return;
        }
        finalReason = `Muu syy: ${customText}`;
    }

    const t = tasks.find(x => String(x.id) === String(pendingOverrideTaskId));
    if (!t) {
        cancelGeofenceManualOverride();
        return;
    }

    const nowIso = new Date().toISOString();
    const distVal = pendingOverrideDistanceMeters;

    // Tallennetaan vaadittu kuittausdata kohteelle
    t.done = true;
    t.completed = true;
    t.blocked = false;
    t.blocked_reason = null;
    t.blocked_at = null;
    t.blocked_distance_meters = null;
    t.verified_on_site = false;
    t.manual_override = true;
    t.override_reason = finalReason;
    t.override_distance_meters = distVal;
    t.completed_at = nowIso;
    t.completedAt = nowIso;
    t.manager_alert = true;

    // Synkronoidaan esimieshuomio myös asiakasrekisterin kortille
    const cust = customers.find(c =>
        (t.customerId && String(c.id) === String(t.customerId)) ||
        (c.name && t.name && c.name.toLowerCase() === t.name.toLowerCase())
    );
    if (cust) {
        cust.manual_override = true;
        cust.override_reason = finalReason;
        cust.override_distance_meters = distVal;
        cust.completed_at = nowIso;
        cust.manager_alert = true;
        persistCustomers();
    }

    // Kirjataan työlokiin esimiesliputuksella
    addWorkLogEntry({
        id: newId(),
        timestamp: nowIso,
        completed_at: nowIso,
        customerId: t.customerId || (cust ? cust.id : null),
        customerName: t.name,
        address: t.address,
        type: t.type || 'Auraus & Hiekoitus',
        sepeliQty: 0,
        notes: t.notes || '',
        contractType: t.contractType || '',
        paymentMethod: t.paymentMethod || '',
        completed: true,
        verified_on_site: false,
        manual_override: true,
        override_reason: finalReason,
        override_distance_meters: distVal,
        manager_alert: true
    });

    pendingOverrideTaskId = null;
    pendingOverrideDistanceMeters = null;

    const dlg = document.getElementById('geofenceOverrideDialog');
    if (dlg) dlg.close('ok');

    saveAndRender();
    if (document.getElementById('viewCustomers').style.display !== 'none') renderCustomers();
    showStatus(`⚠️ "${esc(t.name)}" kuitattu manuaalisesti (${esc(finalReason)}). Merkintä tallennettu esimiehelle.`, 'info');
}
window.confirmGeofenceManualOverride = confirmGeofenceManualOverride;

// ============================================================
// 🚫 ESTEIDEN HALLINTA & ILMOITUS ETEENPÄIN (Ei pääse tekemään)
// ============================================================
let pendingObstacleTaskId = null;
let pendingObstacleDistanceMeters = null;

function openTaskObstacleModal(taskId) {
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;
    pendingObstacleTaskId = t.id;
    pendingObstacleDistanceMeters = null;

    const targetInfoEl = document.getElementById('obstacleTargetInfo');
    if (targetInfoEl) targetInfoEl.textContent = `Kohde: ${t.name} (${t.address})`;

    const locInfoEl = document.getElementById('obstacleLocationInfo');
    if (locInfoEl) {
        if (t.blocked && t.blocked_reason) {
            locInfoEl.textContent = `Aiemmin ilmoitettu este: ${t.blocked_reason}${t.blocked_at ? ` (${fmtDateTime(t.blocked_at)})` : ''}`;
        } else {
            locInfoEl.textContent = 'Valitse esteen syy ja vahvista ilmoitus esimiehelle/työnjohdolle.';
        }
    }

    // Nollataan radiovalinnat ja tekstikenttä
    let matchedRadio = false;
    document.querySelectorAll('input[name="taskObstacleReason"]').forEach(r => {
        if (t.blocked && t.blocked_reason && t.blocked_reason.startsWith(r.value)) {
            r.checked = true;
            matchedRadio = true;
        } else {
            r.checked = false;
        }
    });

    const customBox = document.getElementById('obstacleCustomBox');
    const customInput = document.getElementById('obstacleCustomReason');
    if (customBox) customBox.style.display = 'none';
    if (customInput) customInput.value = '';

    if (t.blocked && t.blocked_reason && !matchedRadio) {
        const muuRadio = document.querySelector('input[name="taskObstacleReason"][value="Muu syy"]');
        if (muuRadio) muuRadio.checked = true;
        if (customBox) customBox.style.display = 'block';
        if (customInput) customInput.value = t.blocked_reason.replace(/^Muu syy:\s*/, '');
    }

    const photoNotice = document.getElementById('obstaclePhotoNotice');
    if (photoNotice) photoNotice.style.display = 'none';

    const removeBtn = document.getElementById('btnRemoveObstacle');
    if (removeBtn) removeBtn.style.display = t.blocked ? 'inline-block' : 'none';

    updateTaskObstacleModalState();

    // Lasketaan likimääräinen etäisyys kohteeseen jos GPS on saatavilla
    if (navigator.geolocation && t.lat && t.lon) {
        navigator.geolocation.getCurrentPosition(pos => {
            const d = calculateDistanceMeters(pos.coords.latitude, pos.coords.longitude, t.lat, t.lon);
            if (d != null && !isNaN(d)) {
                pendingObstacleDistanceMeters = Math.round(d);
                if (locInfoEl) locInfoEl.textContent += ` · Etäisyys kohteesta: ${pendingObstacleDistanceMeters} m`;
            }
        }, () => {}, { timeout: 4000 });
    }

    const dlg = document.getElementById('taskObstacleDialog');
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
}
window.openTaskObstacleModal = openTaskObstacleModal;

function updateTaskObstacleModalState() {
    const selected = document.querySelector('input[name="taskObstacleReason"]:checked')?.value || '';
    const customBox = document.getElementById('obstacleCustomBox');
    const customInput = document.getElementById('obstacleCustomReason');
    const confirmBtn = document.getElementById('btnConfirmTaskObstacle');

    if (selected === 'Muu syy') {
        if (customBox) customBox.style.display = 'block';
        const hasCustomText = !!(customInput && customInput.value.trim().length > 0);
        if (confirmBtn) confirmBtn.disabled = !hasCustomText;
    } else if (selected) {
        if (customBox) customBox.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = false;
    } else {
        if (customBox) customBox.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = true;
    }
}
window.updateTaskObstacleModalState = updateTaskObstacleModalState;

function cancelTaskObstacle() {
    pendingObstacleTaskId = null;
    pendingObstacleDistanceMeters = null;
    const dlg = document.getElementById('taskObstacleDialog');
    if (dlg) dlg.close('cancel');
}
window.cancelTaskObstacle = cancelTaskObstacle;

function removeObstacleFromTask() {
    const t = tasks.find(x => String(x.id) === String(pendingObstacleTaskId));
    if (!t) {
        cancelTaskObstacle();
        return;
    }
    t.blocked = false;
    t.blocked_reason = null;
    t.blocked_at = null;
    t.blocked_distance_meters = null;
    t.manager_alert = false;

    const cust = customers.find(c =>
        (t.customerId && String(c.id) === String(t.customerId)) ||
        (c.name && t.name && c.name.toLowerCase() === t.name.toLowerCase())
    );
    if (cust) {
        cust.manager_alert = false;
        persistCustomers();
    }

    const dlg = document.getElementById('taskObstacleDialog');
    if (dlg) dlg.close('cleared');
    pendingObstacleTaskId = null;
    pendingObstacleDistanceMeters = null;

    saveAndRender();
    showStatus(`Kohteen "${esc(t.name)}" este poistettu ja kohde palautettu normaalitilaan.`, 'info');
}
window.removeObstacleFromTask = removeObstacleFromTask;

async function capturePhotoForObstacle() {
    const t = tasks.find(x => String(x.id) === String(pendingObstacleTaskId));
    if (!t) return;
    const selected = document.querySelector('input[name="taskObstacleReason"]:checked')?.value || 'Este kohteessa';
    const custom = document.getElementById('obstacleCustomReason')?.value.trim() || '';
    const reasonDesc = (selected === 'Muu syy' && custom) ? custom : selected;

    pendingPhotoContext = {
        taskId: t.id,
        customerId: t.customerId || null,
        customerName: t.name,
        address: t.address,
        logId: null
    };
    const titleEl = document.getElementById('photoTargetTitle');
    if (titleEl) titleEl.textContent = `${t.name} (Este: ${reasonDesc})`;

    resetPhotoDialog();
    const tagObstacle = document.querySelector('input[name="photoTag"][value="Este/poikkeus"]') ||
                        document.querySelector('input[name="photoTag"][value="Ennen työtä"]');
    if (tagObstacle) tagObstacle.checked = true;

    const notesInput = document.getElementById('photoNotesInput');
    if (notesInput) notesInput.value = `🚫 Este kohteessa: ${reasonDesc}`;

    const capDlg = document.getElementById('photoCaptureDialog');
    if (capDlg) {
        capDlg.returnValue = '';
        capDlg.showModal();
        capDlg.addEventListener('close', () => {
            if (capDlg.returnValue === 'ok') {
                const notice = document.getElementById('obstaclePhotoNotice');
                if (notice) notice.style.display = 'inline';
            }
        }, { once: true });
    }
}
window.capturePhotoForObstacle = capturePhotoForObstacle;

function confirmTaskObstacle() {
    const selected = document.querySelector('input[name="taskObstacleReason"]:checked')?.value || '';
    if (!selected) return;

    const customInput = document.getElementById('obstacleCustomReason');
    let finalReason = selected;
    if (selected === 'Muu syy') {
        const customText = customInput ? customInput.value.trim() : '';
        if (!customText) {
            alert('Kirjoita perustelu "Muu syy" -kenttään!');
            return;
        }
        finalReason = `Muu syy: ${customText}`;
    }

    const t = tasks.find(x => String(x.id) === String(pendingObstacleTaskId));
    if (!t) {
        cancelTaskObstacle();
        return;
    }

    const nowIso = new Date().toISOString();
    const distVal = pendingObstacleDistanceMeters;

    // Merkitään kohde estyneeksi
    t.blocked = true;
    t.blocked_reason = finalReason;
    t.blocked_at = nowIso;
    t.blocked_distance_meters = distVal;
    t.manager_alert = true;
    t.done = false;

    // Synkronoidaan asiakastietoihin
    const cust = customers.find(c =>
        (t.customerId && String(c.id) === String(t.customerId)) ||
        (c.name && t.name && c.name.toLowerCase() === t.name.toLowerCase())
    );
    if (cust) {
        cust.manager_alert = true;
        cust.last_blocked_reason = finalReason;
        cust.last_blocked_at = nowIso;
        persistCustomers();
    }

    // Tallennetaan työlokiin esteilmoitus
    addWorkLogEntry({
        id: newId(),
        timestamp: nowIso,
        completed_at: nowIso,
        customerId: t.customerId || (cust ? cust.id : null),
        customerName: t.name,
        address: t.address,
        type: '🚫 Ei päästy tekemään (Este)',
        notes: `Este: ${finalReason}${distVal != null ? ` (Etäisyys: ${distVal} m)` : ''}`,
        completed: false,
        blocked: true,
        blocked_reason: finalReason,
        blocked_at: nowIso,
        override_distance_meters: distVal,
        manager_alert: true,
        status: 'blocked'
    });

    // 🛰️ ILMOITUS ETEENPÄIN
    // 1. Web Notification API (jos selain tukee)
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                new Notification(`YardFlow: Este kohteessa ${t.name}`, {
                    body: `Syy: ${finalReason}\nOsoite: ${t.address}`,
                    icon: './icons/icon-192.png'
                });
            } catch (e) {}
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // 2. Tärinäpalaute mobiililaitteessa
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }

    // 3. Tallenna esimieshälytysjonoon työnjohtoa varten
    try {
        const alerts = JSON.parse(localStorage.getItem('yardflow_manager_alerts_v1')) || [];
        alerts.unshift({
            id: newId(),
            type: 'obstacle',
            targetName: t.name,
            address: t.address,
            reason: finalReason,
            timestamp: nowIso,
            distanceMeters: distVal
        });
        localStorage.setItem('yardflow_manager_alerts_v1', JSON.stringify(alerts.slice(0, 50)));
    } catch (e) {}

    const dlg = document.getElementById('taskObstacleDialog');
    if (dlg) dlg.close('ok');

    pendingObstacleTaskId = null;
    pendingObstacleDistanceMeters = null;

    saveAndRender();
    if (document.getElementById('viewCustomers').style.display !== 'none') renderCustomers();

    showStatus(`🚨 Ilmoitus lähetetty työnjohdolle: "${esc(t.name)}" merkitty estyneeksi (${esc(finalReason)}).`, 'error');
}
window.confirmTaskObstacle = confirmTaskObstacle;
