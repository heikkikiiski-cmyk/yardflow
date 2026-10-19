// ============================================================
// YardFlow - Pääsovelluslogiikka, tilakytkin, tapahtumankuuntelijat ja alustus (js/app.js)
// ============================================================

// ---------- Teeman hallinta (Apple Light / Dark) ----------
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
        localStorage.setItem('yardflow_theme', next);
    } catch (e) {}
    updateThemeUI(next);
}
window.toggleTheme = toggleTheme;

function updateThemeUI(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        if (theme === 'dark') {
            btn.innerHTML = '<span class="theme-toggle-icon">☀️</span><span class="theme-toggle-text">Vaalea</span>';
            btn.setAttribute('title', 'Vaihda vaaleaan teemaan');
            btn.setAttribute('aria-label', 'Vaihda vaaleaan teemaan');
        } else {
            btn.innerHTML = '<span class="theme-toggle-icon">🌙</span><span class="theme-toggle-text">Tumma</span>';
            btn.setAttribute('title', 'Vaihda tummaan teemaan');
            btn.setAttribute('aria-label', 'Vaihda tummaan teemaan');
        }
    }
    const meta = document.getElementById('metaThemeColor');
    if (meta) {
        meta.setAttribute('content', theme === 'dark' ? '#090a0f' : '#f5f5f7');
    }
}
window.updateThemeUI = updateThemeUI;

// Käyttötilan vaihto (Kenttätila vs. Hallintatila)
function setAppMode(mode) {
    currentAppMode = (mode === 'admin' || mode === 'manager') ? 'admin' : 'field';
    try {
        localStorage.setItem('yardflow_app_mode', currentAppMode);
    } catch (e) {}

    document.documentElement.setAttribute('data-app-mode', currentAppMode);

    const btnField = document.getElementById('btnModeField');
    const btnAdmin = document.getElementById('btnModeAdmin');
    const badge = document.getElementById('appModeBadge');
    const btnSettingsField = document.getElementById('btnSettingsModeField');
    const btnSettingsAdmin = document.getElementById('btnSettingsModeAdmin');

    if (btnField) btnField.classList.toggle('active', currentAppMode === 'field');
    if (btnAdmin) btnAdmin.classList.toggle('active', currentAppMode === 'admin');

    if (btnSettingsField) {
        btnSettingsField.className = currentAppMode === 'field' ? 'btn-primary' : 'btn-outline';
    }
    if (btnSettingsAdmin) {
        btnSettingsAdmin.className = currentAppMode === 'admin' ? 'btn-primary' : 'btn-outline';
    }

    if (badge) {
        if (currentAppMode === 'field') {
            badge.className = 'mode-status-badge mode-badge-field';
            badge.textContent = '🚜 Kenttätila';
            badge.title = 'Kenttätila aktiivinen: kartat ja markkerit lukittu, kuljettajanäkymä.';
        } else {
            badge.className = 'mode-status-badge mode-badge-admin';
            badge.textContent = '🛠️ Hallintatila';
            badge.title = 'Hallintatila aktiivinen: piirtotyökalut ja muokkaus käytettävissä.';
        }
    }

    // Jos poistutaan hallintatilasta kenttätilaan, suljetaan avoimet piirto- ja muokkaustoiminnot
    if (currentAppMode === 'field') {
        if (yardMap && yardMap.pm) {
            yardMap.pm.disableDraw();
            yardMap.pm.disableGlobalEditMode();
            yardMap.pm.disableGlobalRemovalMode();
            if (typeof yardMap.pm.disableGlobalRotateMode === 'function') yardMap.pm.disableGlobalRotateMode();
        }
        if (selectedMapLayer) {
            if (selectedMapLayer.transform && selectedMapLayer.transform._enabled) {
                selectedMapLayer.transform.disable();
            }
            if (selectedMapLayer.pm && typeof selectedMapLayer.pm.enabled === 'function' && selectedMapLayer.pm.enabled()) {
                selectedMapLayer.pm.disable();
            }
            selectedMapLayer = null;
        }
        if (typeof isPinDropModeActive !== 'undefined' && isPinDropModeActive) disableMapPinDropMode();
        if (typeof activePinMovingTaskId !== 'undefined' && activePinMovingTaskId != null) {
            activePinMovingTaskId = null;
        }
    }

    if (typeof renderTasks === 'function') renderTasks();
}
window.setAppMode = setAppMode;

// Kotinäkymän widgetit ja pikatoiminnot
function handleHomeWidgetToggle(key, isEnabled) {
    const cfg = getHomeWidgetConfig();
    cfg[key] = !!isEnabled;
    saveHomeWidgetConfig(cfg);
    applyHomeWidgetVisibility();
}
window.handleHomeWidgetToggle = handleHomeWidgetToggle;

function applyHomeWidgetVisibility() {
    const cfg = getHomeWidgetConfig();

    const wProgress = document.getElementById('widget-progress');
    const wNextYard = document.getElementById('widget-next-yard');
    const wTickets = document.getElementById('widget-tickets');
    const wSearch = document.getElementById('widget-search');

    if (wProgress) wProgress.style.display = cfg.progress ? '' : 'none';
    if (wNextYard) wNextYard.style.display = cfg.nextYard ? '' : 'none';
    if (wTickets) wTickets.style.display = cfg.tickets ? '' : 'none';
    if (wSearch) wSearch.style.display = cfg.search ? '' : 'none';

    const cbProgress = document.getElementById('show-widget-progress');
    const cbNextYard = document.getElementById('show-widget-next-yard');
    const cbTickets = document.getElementById('show-widget-tickets');
    const cbSearch = document.getElementById('show-widget-search');

    if (cbProgress) cbProgress.checked = !!cfg.progress;
    if (cbNextYard) cbNextYard.checked = !!cfg.nextYard;
    if (cbTickets) cbTickets.checked = !!cfg.tickets;
    if (cbSearch) cbSearch.checked = !!cfg.search;
}
window.applyHomeWidgetVisibility = applyHomeWidgetVisibility;

function updateDashboardWidgets() {
    if (!tasks) return;
    const total = tasks.length;
    const doneList = tasks.filter(t => t.done);
    const done = doneList.length;
    const remaining = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // 1. Edistymismittari
    const elPct = document.getElementById('widgetProgressPercent');
    const elDone = document.getElementById('widgetDoneCount');
    const elRemaining = document.getElementById('widgetRemainingCount');
    const elTotal = document.getElementById('widgetTotalCount');
    const elFill = document.getElementById('widgetProgressBarFill');

    if (elPct) elPct.textContent = `${pct}%`;
    if (elDone) elDone.textContent = `${done}`;
    if (elRemaining) elRemaining.textContent = `${remaining}`;
    if (elTotal) elTotal.textContent = `${total}`;
    if (elFill) elFill.style.width = `${pct}%`;

    // 2. Seuraava ajokohde
    const nextTask = tasks.find(t => !t.done && !t.blocked);
    const wNextEmpty = document.getElementById('widgetNextYardEmpty');
    const wNextDetails = document.getElementById('widgetNextYardDetails');
    const wNextName = document.getElementById('widgetNextYardName');
    const wNextAddr = document.getElementById('widgetNextYardAddress');

    if (!nextTask) {
        if (wNextEmpty) {
            wNextEmpty.style.display = '';
            wNextEmpty.textContent = total === 0 ? 'Ajolistalla ei ole vielä kohteita.' : 'Kaikki päivän kohteet kuitattu! 🎉';
        }
        if (wNextDetails) wNextDetails.style.display = 'none';
    } else {
        if (wNextEmpty) wNextEmpty.style.display = 'none';
        if (wNextDetails) wNextDetails.style.display = '';
        if (wNextName) wNextName.textContent = nextTask.name;
        if (wNextAddr) wNextAddr.textContent = nextTask.address || 'Ei osoitetta';
    }

    // 3. Työkeikat ja huomiot
    const ticketsList = document.getElementById('widgetTicketsList');
    const ticketsBadge = document.getElementById('widgetTicketsCountBadge');
    const attentionTasks = tasks.filter(t => t.blocked || t.manual_override || t.manager_alert || (t.notes && t.notes.trim()));

    if (ticketsBadge) {
        ticketsBadge.textContent = `${attentionTasks.length} huomiota`;
    }
    if (ticketsList) {
        if (attentionTasks.length === 0) {
            ticketsList.innerHTML = '<div style="color: var(--muted); font-size: 0.8rem;">Ei aktiivisia esteitä tai erityishuomioita.</div>';
        } else {
            ticketsList.innerHTML = attentionTasks.map(t => {
                const icon = t.blocked ? '🚫' : (t.manual_override ? '⚠️' : 'ℹ️');
                const label = t.blocked ? (t.blocked_reason || 'Ei pääse') : (t.manual_override ? (t.override_reason || 'Manuaalikuittaus') : t.notes);
                return `
                    <div style="display: flex; gap: 6px; align-items: flex-start; margin-bottom: 6px; padding: 4px 6px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                        <span>${icon}</span>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(t.name)}</div>
                            <div style="color: var(--muted); font-size: 0.74rem;">${esc(label)}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function navigateToNextYard() {
    const nextTask = tasks.find(t => !t.done && !t.blocked) || tasks.find(t => !t.done);
    if (!nextTask) {
        alert('Ei tekemättömiä kohteita reitillä.');
        return;
    }
    const q = encodeURIComponent(nextTask.address || nextTask.name);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank');
}
window.navigateToNextYard = navigateToNextYard;

function completeNextYard() {
    const nextTask = tasks.find(t => !t.done && !t.blocked) || tasks.find(t => !t.done);
    if (!nextTask) {
        alert('Ei tekemättömiä kohteita reitillä.');
        return;
    }
    handleCompleteTaskClick(nextTask.id);
}
window.completeNextYard = completeNextYard;

// ---------- Välilehtien vaihto ----------
function switchTab(tab) {
    const routesView = document.getElementById('viewRoutes');
    const custView = document.getElementById('viewCustomers');
    const logsView = document.getElementById('viewLogs');
    const billingView = document.getElementById('viewBilling');
    const settingsView = document.getElementById('viewSettings');

    const tabBtnRoutes = document.getElementById('tabBtnRoutes');
    const tabBtnCust = document.getElementById('tabBtnCustomers');
    const tabBtnLogs = document.getElementById('tabBtnLogs');
    const tabBtnBilling = document.getElementById('tabBtnBilling');
    const tabBtnSettings = document.getElementById('tabBtnSettings');

    if (routesView) routesView.style.display = tab === 'routes' ? '' : 'none';
    if (custView) custView.style.display = tab === 'customers' ? '' : 'none';
    if (logsView) logsView.style.display = tab === 'logs' ? '' : 'none';
    if (billingView) billingView.style.display = tab === 'billing' ? '' : 'none';
    if (settingsView) settingsView.style.display = tab === 'settings' ? '' : 'none';

    if (tab === 'routes' && typeof yardMap !== 'undefined' && yardMap) {
        setTimeout(() => {
            yardMap.invalidateSize();
        }, 50);
    }

    if (tabBtnRoutes) tabBtnRoutes.classList.toggle('active', tab === 'routes');
    if (tabBtnCust) tabBtnCust.classList.toggle('active', tab === 'customers');
    if (tabBtnLogs) tabBtnLogs.classList.toggle('active', tab === 'logs');
    if (tabBtnBilling) tabBtnBilling.classList.toggle('active', tab === 'billing');
    if (tabBtnSettings) tabBtnSettings.classList.toggle('active', tab === 'settings');

    if (tab === 'customers') renderCustomers();
    if (tab === 'logs') renderWorkLogs();
    if (tab === 'billing') initBillingTab();
    if (tab === 'settings') applyHomeWidgetVisibility();
}

// Hinnoittelu, laskutus ja PDF-esikatselu
function openDefaultPricingModal() {
    document.getElementById('defMonthlyPrice').value = defaultPricing.monthlyPrice;
    document.getElementById('defPlowPrice').value = defaultPricing.plowPrice;
    document.getElementById('defSandPrice').value = defaultPricing.sandPrice;
    document.getElementById('defGravelPrice').value = defaultPricing.gravelPrice;
    document.getElementById('defHourlyRate').value = defaultPricing.hourlyRate;
    document.getElementById('defVatRate').value = defaultPricing.vatRate;
    document.getElementById('defaultPricingDialog').showModal();
}

function saveDefaultPricingFromDialog() {
    defaultPricing.monthlyPrice = parseFloat(document.getElementById('defMonthlyPrice').value) || 0;
    defaultPricing.plowPrice = parseFloat(document.getElementById('defPlowPrice').value) || 0;
    defaultPricing.sandPrice = parseFloat(document.getElementById('defSandPrice').value) || 0;
    defaultPricing.gravelPrice = parseFloat(document.getElementById('defGravelPrice').value) || 0;
    defaultPricing.hourlyRate = parseFloat(document.getElementById('defHourlyRate').value) || 0;
    defaultPricing.vatRate = parseFloat(document.getElementById('defVatRate').value) || 0;
    persistDefaultPricing();
    document.getElementById('defaultPricingDialog').close('ok');
    showStatus('Oletushinnasto päivitetty!', 'success');
    if (currentInvoiceCustomer) {
        generateBillingDraft();
    }
}

function getCustomerPrice(cust, key) {
    if (cust && cust[key] != null && !isNaN(cust[key]) && Number(cust[key]) > 0) {
        return Number(cust[key]);
    }
    return defaultPricing[key] || 0;
}

function initBillingTab() {
    const custSel = document.getElementById('billingCustomerSelect');
    const cur = custSel.value;
    custSel.innerHTML = '<option value="">-- Valitse asiakas --</option>' +
        customers.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.address)})</option>`).join('');
    custSel.value = cur;

    const startInput = document.getElementById('billingStartDate');
    const endInput = document.getElementById('billingEndDate');
    if (!startInput.value || !endInput.value) {
        setBillingPeriod('thisMonth');
    }
    persistDefaultPricing();
}

function setBillingPeriod(type) {
    const now = new Date();
    const startInput = document.getElementById('billingStartDate');
    const endInput = document.getElementById('billingEndDate');

    if (type === 'thisMonth') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startInput.value = firstDay.toISOString().slice(0, 10);
        endInput.value = lastDay.toISOString().slice(0, 10);
    } else if (type === 'lastMonth') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        startInput.value = firstDay.toISOString().slice(0, 10);
        endInput.value = lastDay.toISOString().slice(0, 10);
    } else if (type === 'last30') {
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startInput.value = past.toISOString().slice(0, 10);
        endInput.value = now.toISOString().slice(0, 10);
    }

    if (document.getElementById('billingCustomerSelect').value) {
        generateBillingDraft();
    }
}

function generateBillingDraft() {
    const custId = document.getElementById('billingCustomerSelect').value;
    const resultCard = document.getElementById('billingResultCard');
    if (!custId) {
        resultCard.style.display = 'none';
        return;
    }

    const customer = customers.find(c => String(c.id) === String(custId));
    if (!customer) return;
    currentInvoiceCustomer = customer;

    const startDateStr = document.getElementById('billingStartDate').value;
    const endDateStr = document.getElementById('billingEndDate').value;
    if (!startDateStr || !endDateStr) {
        alert('Valitse laskutusjakson alkamis- ja päättymispäivämäärä!');
        return;
    }

    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T23:59:59');

    // Haetaan asiakkaan lokimerkinnät tältä aikaväliltä
    currentInvoiceVisits = workLogs.filter(l => {
        const matchesCust = (l.customerId && String(l.customerId) === String(customer.id)) ||
                            (l.customerName && l.customerName.toLowerCase() === customer.name.toLowerCase());
        if (!matchesCust) return false;
        const logDate = new Date(l.timestamp);
        return logDate >= start && logDate <= end;
    });
    currentInvoiceVisits.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Lasketaan toimenpiteet
    let plowVisits = 0;
    let sandVisits = 0;
    let totalSepeliKg = 0;

    currentInvoiceVisits.forEach(v => {
        const type = (v.type || '').toLowerCase();
        if (type.includes('auraus')) plowVisits++;
        if (type.includes('hiekoitus')) sandVisits++;
        if (v.sepeliQty && !isNaN(v.sepeliQty)) {
            totalSepeliKg += Number(v.sepeliQty);
        }
    });

    // Hinnat
    const monthlyRate = getCustomerPrice(customer, 'monthlyPrice');
    const plowRate = getCustomerPrice(customer, 'plowPrice');
    const sandRate = getCustomerPrice(customer, 'sandPrice');
    const gravelRate = getCustomerPrice(customer, 'gravelPrice');

    // Rakennetaan laskurivit
    currentInvoiceLines = [];

    // 1. Kuukausimaksu jos sopimusmalliin kuuluu kiinteä maksu
    const contract = customer.contractType || '';
    if (contract === 'Kuukausisopimus' || contract === 'Kuukausi + käynnit') {
        currentInvoiceLines.push({
            id: newId(),
            description: 'Kiinteä kuukausimaksu (kiinteistönhuolto & aurausvalmius)',
            qty: 1,
            unit: 'kk',
            unitPrice: monthlyRate
        });
    }

    // 2. Aurauskäynnit (jos käynnit laskutetaan erikseen)
    if (contract !== 'Kuukausisopimus' && plowVisits > 0) {
        currentInvoiceLines.push({
            id: newId(),
            description: 'Auraus ja lumityöt mönkijällä',
            qty: plowVisits,
            unit: 'krt',
            unitPrice: plowRate
        });
    } else if (contract === 'Kuukausisopimus' && plowVisits > 0) {
        // Kuukausisopimuksessa käynnit sisältyvät hintaan, mutta ne voi eritellä 0 € rivinä
        currentInvoiceLines.push({
            id: newId(),
            description: `Aurauskäynnit (sisältyy kuukausisopimukseen)`,
            qty: plowVisits,
            unit: 'krt',
            unitPrice: 0
        });
    }

    // 3. Hiekoituskäynnit
    if (sandVisits > 0 && sandRate > 0) {
        currentInvoiceLines.push({
            id: newId(),
            description: 'Liukkaudentorjunta ja koneellinen hiekoitus',
            qty: sandVisits,
            unit: 'krt',
            unitPrice: sandRate
        });
    }

    // 4. Kulunut sepeli
    if (totalSepeliKg > 0) {
        currentInvoiceLines.push({
            id: newId(),
            description: 'Hiekoitussepeli (koneellisesti levitetty)',
            qty: totalSepeliKg,
            unit: 'kg',
            unitPrice: gravelRate
        });
    }

    // Jos rivejä ei vielä tullut, lisätään perusrivi
    if (currentInvoiceLines.length === 0) {
        currentInvoiceLines.push({
            id: newId(),
            description: 'Auraus- ja liukkaudentorjuntatyö',
            qty: 1,
            unit: 'kpl',
            unitPrice: plowRate
        });
    }

    // Päivitä otsikot ja näkymä
    document.getElementById('billingResultTitle').textContent = `Laskutuserittely: ${customer.name}`;
    const fmtStart = new Date(startDateStr).toLocaleDateString('fi-FI');
    const fmtEnd = new Date(endDateStr).toLocaleDateString('fi-FI');
    document.getElementById('billingResultSubtitle').textContent = `Laskutusjakso: ${fmtStart} – ${fmtEnd} · ${customer.address}`;
    document.getElementById('billingContractBadge').textContent = `📋 ${customer.contractType || 'Käynnit'}`;
    document.getElementById('billingPaymentBadge').textContent = `${customer.paymentMethod === 'Laskutus' ? '💳' : '💵'} ${customer.paymentMethod || 'Laskutus'}`;

    renderInvoiceLinesTable();
    renderInvoiceVisitsAnnex();
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderInvoiceLinesTable() {
    const tbody = document.getElementById('invoiceLinesBody');
    tbody.innerHTML = currentInvoiceLines.map((line, idx) => {
        const lineTotal = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
        return `
            <tr data-line-id="${line.id}">
                <td>
                    <input type="text" class="billing-input" value="${esc(line.description)}" oninput="updateInvoiceLine(${idx}, 'description', this.value)">
                </td>
                <td>
                    <input type="number" class="billing-input" style="text-align: center;" step="0.5" min="0" value="${line.qty}" oninput="updateInvoiceLine(${idx}, 'qty', this.value)">
                </td>
                <td>
                    <input type="text" class="billing-input" value="${esc(line.unit)}" oninput="updateInvoiceLine(${idx}, 'unit', this.value)">
                </td>
                <td>
                    <input type="number" class="billing-input" style="text-align: right;" step="0.5" min="0" value="${line.unitPrice}" oninput="updateInvoiceLine(${idx}, 'unitPrice', this.value)">
                </td>
                <td style="text-align: right; font-weight: 700; font-size: 0.9rem; padding-right: 6px;">
                    ${lineTotal.toFixed(2)} €
                </td>
                <td style="text-align: center;">
                    <button type="button" class="tiny-btn danger" style="padding: 2px 6px;" onclick="removeInvoiceLine(${idx})" title="Poista rivi">✕</button>
                </td>
            </tr>
        `;
    }).join('');
    recalcInvoiceTotals();
}

function updateInvoiceLine(idx, field, val) {
    if (!currentInvoiceLines[idx]) return;
    if (field === 'qty' || field === 'unitPrice') {
        currentInvoiceLines[idx][field] = parseFloat(val) || 0;
    } else {
        currentInvoiceLines[idx][field] = val;
    }
    const row = document.querySelectorAll('#invoiceLinesBody tr')[idx];
    if (row) {
        const totalCell = row.children[4];
        const lineTotal = (Number(currentInvoiceLines[idx].qty) || 0) * (Number(currentInvoiceLines[idx].unitPrice) || 0);
        totalCell.textContent = lineTotal.toFixed(2) + ' €';
    }
    recalcInvoiceTotals();
}

function addCustomInvoiceLine() {
    currentInvoiceLines.push({
        id: newId(),
        description: 'Muu pihatyö / lisäveloitus',
        qty: 1,
        unit: 'h',
        unitPrice: defaultPricing.hourlyRate || 0
    });
    renderInvoiceLinesTable();
}

function removeInvoiceLine(idx) {
    currentInvoiceLines.splice(idx, 1);
    renderInvoiceLinesTable();
}

function recalcInvoiceTotals() {
    let bruttoTotal = 0;
    currentInvoiceLines.forEach(l => {
        bruttoTotal += (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
    });

    const includeVat = document.getElementById('billingIncludeVat').checked;
    const vatRate = defaultPricing.vatRate || 25.5;

    let netTotal, vatTotal, grandTotal;
    if (includeVat) {
        grandTotal = bruttoTotal;
        netTotal = vatRate > 0 ? (grandTotal / (1 + vatRate / 100)) : grandTotal;
        vatTotal = grandTotal - netTotal;
        const grandLbl = document.getElementById('billingGrandTotalLabel');
        if (grandLbl) grandLbl.textContent = 'Yhteensä maksettava (sis. ALV):';
    } else {
        // ALV 0 % (käännetty verovelvollisuus)
        netTotal = vatRate > 0 ? (bruttoTotal / (1 + vatRate / 100)) : bruttoTotal;
        vatTotal = 0;
        grandTotal = netTotal;
        const grandLbl = document.getElementById('billingGrandTotalLabel');
        if (grandLbl) grandLbl.textContent = 'Yhteensä maksettava (ALV 0 %):';
    }

    document.getElementById('billingNetTotal').textContent = netTotal.toFixed(2).replace('.', ',') + ' €';
    const vatRow = document.getElementById('billingVatRow');
    if (includeVat) {
        vatRow.style.display = 'flex';
        document.getElementById('billingVatTotal').textContent = vatTotal.toFixed(2).replace('.', ',') + ' €';
    } else {
        vatRow.style.display = 'none';
    }
    document.getElementById('billingGrandTotal').textContent = grandTotal.toFixed(2).replace('.', ',') + ' €';
}

function renderInvoiceVisitsAnnex() {
    const box = document.getElementById('billingVisitsList');
    document.getElementById('billingVisitsCount').textContent = currentInvoiceVisits.length;

    if (currentInvoiceVisits.length === 0) {
        box.innerHTML = '<div style="color:var(--muted);padding:4px 0;">Valitulla aikavälillä ei ole kirjattuja käyntejä työlokissa. (Laskurivit on silti luotu ja muokattavissa yllä).</div>';
        return;
    }

    box.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border); color: var(--muted); text-align: left;">
                    <th style="padding: 4px 6px;">Pvm &amp; klo</th>
                    <th style="padding: 4px 6px;">Työ</th>
                    <th style="padding: 4px 6px;">Sepeli (kg)</th>
                    <th style="padding: 4px 6px;">Huomiot</th>
                </tr>
            </thead>
            <tbody>
                ${currentInvoiceVisits.map(v => `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                        <td style="padding: 4px 6px; white-space: nowrap; font-weight: 600;">${esc(fmtDateTime(v.timestamp))}</td>
                        <td style="padding: 4px 6px;">${esc(v.type)}</td>
                        <td style="padding: 4px 6px;">${v.sepeliQty > 0 ? `🪨 ${v.sepeliQty} kg` : '-'}</td>
                        <td style="padding: 4px 6px; color: var(--fg-secondary);">${esc(v.notes || '-')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function copyInvoiceTextToClipboard() {
    if (!currentInvoiceCustomer) return;
    const c = currentInvoiceCustomer;
    const startDateStr = document.getElementById('billingStartDate').value;
    const endDateStr = document.getElementById('billingEndDate').value;
    const fmtStart = new Date(startDateStr).toLocaleDateString('fi-FI');
    const fmtEnd = new Date(endDateStr).toLocaleDateString('fi-FI');

    let text = `LASKUTUSERITTELY / TYÖN ERITTELY\n`;
    text += `Asiakas: ${c.name}\n`;
    text += `Osoite: ${c.address}\n`;
    text += `Laskutusjakso: ${fmtStart} – ${fmtEnd}\n`;
    text += `Sopimusmalli: ${c.contractType || 'Käynnit'}\n`;
    text += `Maksutapa: ${c.paymentMethod || 'Laskutus'}\n\n`;
    text += `LASKURIVIT (Hinnat sis. ALV):\n`;
    text += `------------------------------------------------------\n`;

    let brutto = 0;
    currentInvoiceLines.forEach(l => {
        const tot = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
        brutto += tot;
        text += `- ${l.description}: ${l.qty} ${l.unit} x ${Number(l.unitPrice).toFixed(2)} € (sis. ALV) = ${tot.toFixed(2)} €\n`;
    });

    const includeVat = document.getElementById('billingIncludeVat').checked;
    const vatRate = defaultPricing.vatRate || 25.5;
    const net = vatRate > 0 ? (brutto / (1 + vatRate / 100)) : brutto;
    const vat = brutto - net;
    const grand = includeVat ? brutto : net;

    text += `------------------------------------------------------\n`;
    if (includeVat) {
        text += `YHTEENSÄ MAKSETTAVA (sis. ALV ${vatRate} %): ${grand.toFixed(2)} €\n`;
        text += `- josta ALV (${vatRate} %): ${vat.toFixed(2)} €\n`;
        text += `- Veroton summa (ALV 0 %): ${net.toFixed(2)} €\n`;
    } else {
        text += `YHTEENSÄ MAKSETTAVA (ALV 0 % käännetty verovelvollisuus): ${grand.toFixed(2)} €\n`;
        text += `- Veroton summa (ALV 0 %): ${net.toFixed(2)} €\n`;
    }

    if (currentInvoiceVisits.length > 0) {
        text += `\nKÄYNTILOKI (${currentInvoiceVisits.length} käyntiä):\n`;
        currentInvoiceVisits.forEach(v => {
            text += `* ${fmtDateTime(v.timestamp)}: ${v.type}${v.sepeliQty > 0 ? ` (Sepeli: ${v.sepeliQty} kg)` : ''}${v.notes ? ` - ${v.notes}` : ''}\n`;
        });
    }

    navigator.clipboard.writeText(text).then(() => {
        showStatus('Laskutusteksti kopioitu leikepöydälle! Voit liittää sen laskutusohjelmaan tai viestiin.', 'success');
    }).catch(err => {
        prompt('Kopioi laskutusteksti tästä:', text);
    });
}

function openPdfPreviewModal(title, htmlContent, filename, directDownload = false) {
    currentPdfFilename = filename || 'YardFlow_Raportti.pdf';
    const reportArea = document.getElementById('printReportArea');
    const previewPaper = document.getElementById('pdfPreviewPaper');
    const previewModal = document.getElementById('pdfPreviewModal');
    const titleEl = document.getElementById('pdfPreviewTitle');
    const statusEl = document.getElementById('pdfPreviewStatus');

    if (reportArea) reportArea.innerHTML = htmlContent;
    if (previewPaper) previewPaper.innerHTML = htmlContent;
    if (titleEl) titleEl.textContent = title || '📄 PDF-raportin esikatselu';
    if (statusEl) statusEl.textContent = 'Voit ladata suoraan PDF-tiedostona (.pdf) tai avata tulostusikkunan.';

    if (previewModal) {
        previewModal.classList.add('open');
    }

    if (directDownload) {
        setTimeout(() => downloadCurrentReportAsPDF(), 150);
    }
}

function closePdfPreviewModal() {
    const previewModal = document.getElementById('pdfPreviewModal');
    if (previewModal) previewModal.classList.remove('open');
}

async function waitForReportImages(container) {
    if (!container) return;
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => {
            img.onload = res;
            img.onerror = res;
        });
    }));
}

async function triggerBrowserPrintReport() {
    const reportArea = document.getElementById('printReportArea');
    const statusEl = document.getElementById('pdfPreviewStatus');
    if (statusEl) statusEl.textContent = 'Avataan tulostus- / PDF-tallennusikkuna...';
    await waitForReportImages(reportArea);
    setTimeout(() => {
        window.print();
    }, 80);
}

async function downloadCurrentReportAsPDF() {
    const previewPaper = document.getElementById('pdfPreviewPaper');
    const statusEl = document.getElementById('pdfPreviewStatus');
    if (!previewPaper) return;

    if (typeof html2pdf === 'undefined') {
        if (statusEl) statusEl.textContent = 'Avataan selaimen PDF-tallennus...';
        await triggerBrowserPrintReport();
        return;
    }

    try {
        if (statusEl) statusEl.textContent = '⏳ Luodaan ja ladataan PDF-tiedostoa...';
        await waitForReportImages(previewPaper);

        const opt = {
            margin: [10, 10, 10, 10],
            filename: currentPdfFilename || 'YardFlow_Raportti.pdf',
            image: { type: 'jpeg', quality: 0.96 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(previewPaper).save();
        if (statusEl) statusEl.textContent = `✅ PDF-tiedosto (${currentPdfFilename}) ladattu!`;
    } catch (err) {
        console.error('PDF-luontivirhe:', err);
        if (statusEl) statusEl.textContent = 'Siirrytään selaimen PDF-tulostukseen...';
        await triggerBrowserPrintReport();
    }
}

function generateAndPrintInvoicePDF(directDownload = false) {
    if (!currentInvoiceCustomer) {
        generateBillingDraft();
    }
    if (!currentInvoiceCustomer) {
        alert('Valitse ensin laskutettava asiakas listalta!');
        return;
    }
    const c = currentInvoiceCustomer;
    const startDateStr = document.getElementById('billingStartDate').value;
    const endDateStr = document.getElementById('billingEndDate').value;
    const fmtStart = startDateStr ? new Date(startDateStr).toLocaleDateString('fi-FI') : '-';
    const fmtEnd = endDateStr ? new Date(endDateStr).toLocaleDateString('fi-FI') : '-';
    const now = new Date();

    let brutto = 0;
    currentInvoiceLines.forEach(l => {
        brutto += (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
    });
    const includeVat = document.getElementById('billingIncludeVat').checked;
    const vatRate = defaultPricing.vatRate || 25.5;
    const net = vatRate > 0 ? (brutto / (1 + vatRate / 100)) : brutto;
    const vat = brutto - net;
    const grand = includeVat ? brutto : net;

    const htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
            <div>
                <h1 style="margin: 0; font-size: 20pt; color: #0f172a; letter-spacing: -0.5px;">🌿 YardFlow</h1>
                <div style="font-size: 10pt; color: #64748b; font-weight: 600;">KIINTEISTÖ- JA PIHATYÖPALVELU · LASKUTUSERITTELY JA LASKULIITE</div>
            </div>
            <div style="text-align: right; font-size: 9.5pt; color: #475569;">
                <div><strong>Laskutusjakso:</strong> ${fmtStart} – ${fmtEnd}</div>
                <div><strong>Päiväys:</strong> ${fmtDateTime(now.toISOString())}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 16px; background: #f8fafc; border: 1px solid #e2e8f8; padding: 12px 14px; border-radius: 8px;">
            <div>
                <div style="font-size: 8.5pt; text-transform: uppercase; color: #64748b; font-weight: 700;">Laskutettava asiakas:</div>
                <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${esc(c.name)}</div>
                <div style="font-size: 10pt; color: #334155; margin-top: 2px;">📍 ${esc(c.address)}</div>
                ${c.phone ? `<div style="font-size: 9.5pt; color: #475569;">📞 ${esc(c.phone)} · ✉️ ${esc(c.email || '-')}</div>` : ''}
            </div>
            <div style="text-align: right;">
                <div style="font-size: 8.5pt; text-transform: uppercase; color: #64748b; font-weight: 700;">Sopimusehdot:</div>
                <div style="font-size: 10pt; color: #0f172a;"><strong>Sopimusmalli:</strong> ${esc(c.contractType || 'Käynnit')}</div>
                <div style="font-size: 10pt; color: #0f172a;"><strong>Maksutapa:</strong> ${esc(c.paymentMethod || 'Laskutus')}</div>
            </div>
        </div>

        <h3 style="margin-top: 20px; margin-bottom: 6px; font-size: 12pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
            Laskutettavat palvelut ja materiaalit (Hinnat sis. ALV)
        </h3>

        <table class="print-table">
            <thead>
                <tr>
                    <th>Nimike / Toimenpide</th>
                    <th style="width: 70px; text-align: center;">Määrä</th>
                    <th style="width: 90px; text-align: center;">Yksikkö</th>
                    <th style="width: 110px; text-align: right;">à Hinta (sis. ALV)</th>
                    <th style="width: 100px; text-align: right;">Yhteensä</th>
                </tr>
            </thead>
            <tbody>
                ${currentInvoiceLines.map(l => {
                    const tot = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
                    return `
                        <tr>
                            <td><strong>${esc(l.description)}</strong></td>
                            <td style="text-align: center;">${l.qty}</td>
                            <td style="text-align: center;">${esc(l.unit)}</td>
                            <td style="text-align: right;">${Number(l.unitPrice).toFixed(2)} €</td>
                            <td style="text-align: right; font-weight: 700;">${tot.toFixed(2)} €</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <!-- Yhteenveto -->
        <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
            <div style="width: 300px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 10pt; color: #475569; margin-bottom: 4px;">
                    <span>Veroton summa (ALV 0 %):</span>
                    <span style="font-weight: 700;">${net.toFixed(2)} €</span>
                </div>
                ${includeVat ? `
                    <div style="display: flex; justify-content: space-between; font-size: 10pt; color: #475569; margin-bottom: 4px;">
                        <span>josta ALV (${vatRate} %):</span>
                        <span style="font-weight: 700;">${vat.toFixed(2)} €</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13pt; font-weight: 800; color: #0f172a; border-top: 2px solid #0284c7; padding-top: 6px; margin-top: 6px;">
                        <span>Yhteensä (sis. ALV):</span>
                        <span>${grand.toFixed(2)} €</span>
                    </div>
                ` : `
                    <div style="display: flex; justify-content: space-between; font-size: 13pt; font-weight: 800; color: #0f172a; border-top: 2px solid #0284c7; padding-top: 6px; margin-top: 6px;">
                        <span>Yhteensä (ALV 0 %):</span>
                        <span>${grand.toFixed(2)} €</span>
                    </div>
                `}
            </div>
        </div>

        <!-- Liite: Käyntipäiväkirja -->
        ${currentInvoiceVisits.length > 0 ? `
            <div style="page-break-before: auto; margin-top: 24px;">
                <h3 style="margin-top: 18px; margin-bottom: 6px; font-size: 11pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                    Liite: Käyntipäiväkirja ja toimenpiteet (${currentInvoiceVisits.length} käyntiä)
                </h3>
                <table class="print-table" style="font-size: 9.5pt;">
                    <thead>
                        <tr>
                            <th style="width: 140px;">Pvm &amp; klo</th>
                            <th>Tehty toimenpide</th>
                            <th style="width: 110px;">Kulunut sepeli (kg)</th>
                            <th>Huomiot</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currentInvoiceVisits.map(v => `
                            <tr>
                                <td style="font-weight: 600;">${esc(fmtDateTime(v.timestamp))}</td>
                                <td>${esc(v.type)}</td>
                                <td>${v.sepeliQty > 0 ? `${v.sepeliQty} kg` : '-'}</td>
                                <td>${esc(v.notes || '-')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}

        <div class="print-signature-box">
            <div class="print-sig-line">
                <strong>Palveluntarjoaja / Laskuttaja:</strong><br><br>
                Allekirjoitus: ____________________________________
            </div>
            <div class="print-sig-line">
                <strong>Tilaajan hyväksyntä:</strong><br><br>
                Kuittaus &amp; Pvm: ________________________________
            </div>
        </div>
    `;

    const safeName = (c.name || 'Asiakas').replace(/[^a-zA-Z0-9äöåÄÖÅ_-]/g, '_');
    const datePart = now.toISOString().slice(0, 10);
    openPdfPreviewModal(
        `📄 Laskutuserittely: ${c.name}`,
        htmlContent,
        `YardFlow_Laskuliite_${safeName}_${datePart}.pdf`,
        directDownload
    );
}

// Valokuvat, EXIF-aikaleimat ja IndexedDB
// ---------- Kuva-apu & IndexedDB ----------
function compressImage(file, maxDimension = 1280, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = e => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function getDB() {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('auraus_db_v1', 1);
        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('photos')) {
                const s = d.createObjectStore('photos', { keyPath: 'id' });
                s.createIndex('customerId', 'customerId', { unique: false });
                s.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
        req.onsuccess = e => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };
        req.onerror = e => reject(e);
    });
}

async function dbSavePhoto(photo) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').put(photo);
        tx.oncomplete = () => resolve(photo);
        tx.onerror = e => reject(e);
    });
}

async function dbGetAllPhotos() {
    try {
        const db = await getDB();
        return new Promise(resolve => {
            const tx = db.transaction('photos', 'readonly');
            const req = tx.objectStore('photos').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    } catch (e) {
        console.error('Virhe haettaessa kuvia:', e);
        return [];
    }
}

async function dbDeletePhoto(id) {
    try {
        const db = await getDB();
        return new Promise(resolve => {
            const tx = db.transaction('photos', 'readwrite');
            tx.objectStore('photos').delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) {
        return false;
    }
}

async function updatePhotoCounts() {
    try {
        const all = await dbGetAllPhotos();
        photoCounts = {};
        all.forEach(p => {
            if (p.customerId) {
                const cid = String(p.customerId);
                photoCounts[cid] = (photoCounts[cid] || 0) + 1;
            }
            if (p.customerName) {
                const cname = p.customerName.toLowerCase().trim();
                photoCounts[cname] = (photoCounts[cname] || 0) + 1;
            }
        });
        document.querySelectorAll('[data-photo-count-for]').forEach(el => {
            const key = el.dataset.photoCountFor;
            const count = photoCounts[key] || photoCounts[key.toLowerCase().trim()] || 0;
            el.textContent = count;
        });
    } catch (e) {
        console.error(e);
    }
}

function parseExifDateString(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString();
    }
    const s = String(val).trim();
    // EXIF-muoto: "YYYY:MM:DD HH:MM:SS" tai ISO-muoto
    const m = s.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
        const d = new Date(
            Number(m[1]),
            Number(m[2]) - 1,
            Number(m[3]),
            Number(m[4]),
            Number(m[5]),
            Number(m[6])
        );
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
    return null;
}

function parseJpegExifDateFromBuffer(arrayBuffer) {
    try {
        const view = new DataView(arrayBuffer);
        if (view.byteLength < 12 || view.getUint16(0, false) !== 0xFFD8) return null;

        let offset = 2;
        while (offset + 4 <= view.byteLength) {
            const marker = view.getUint16(offset, false);
            offset += 2;
            if (marker === 0xFFDA || marker === 0xFFD9) break;
            const segLen = view.getUint16(offset, false);
            if (segLen < 2 || offset + segLen > view.byteLength) break;

            // APP1 (0xFFE1) ja "Exif\0\0"
            if (marker === 0xFFE1 && segLen >= 14) {
                const exifHeader = view.getUint32(offset + 2, false);
                const exifZero = view.getUint16(offset + 6, false);
                if (exifHeader === 0x45786966 && exifZero === 0x0000) {
                    const tiffStart = offset + 8;
                    const byteOrder = view.getUint16(tiffStart, false);
                    const littleEndian = (byteOrder === 0x4949);
                    if (!littleEndian && byteOrder !== 0x4D4D) return null;

                    const readAsciiTag = (ifdOffset, targetTag) => {
                        if (ifdOffset + 2 > view.byteLength) return null;
                        const entries = view.getUint16(ifdOffset, littleEndian);
                        for (let i = 0; i < entries; i++) {
                            const entryOffset = ifdOffset + 2 + i * 12;
                            if (entryOffset + 12 > view.byteLength) break;
                            const tag = view.getUint16(entryOffset, littleEndian);
                            const type = view.getUint16(entryOffset + 2, littleEndian);
                            const count = view.getUint32(entryOffset + 4, littleEndian);
                            if (tag === targetTag && type === 2 && count >= 10 && count < 64) {
                                const valOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
                                if (valOffset + count <= view.byteLength) {
                                    let str = '';
                                    for (let c = 0; c < count - 1; c++) {
                                        const ch = view.getUint8(valOffset + c);
                                        if (ch === 0) break;
                                        str += String.fromCharCode(ch);
                                    }
                                    return str;
                                }
                            }
                        }
                        return null;
                    };

                    const findSubIfdOffset = (ifdOffset, subTag) => {
                        if (ifdOffset + 2 > view.byteLength) return null;
                        const entries = view.getUint16(ifdOffset, littleEndian);
                        for (let i = 0; i < entries; i++) {
                            const entryOffset = ifdOffset + 2 + i * 12;
                            if (entryOffset + 12 > view.byteLength) break;
                            const tag = view.getUint16(entryOffset, littleEndian);
                            if (tag === subTag) {
                                return tiffStart + view.getUint32(entryOffset + 8, littleEndian);
                            }
                        }
                        return null;
                    };

                    const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
                    const exifIfdOffset = findSubIfdOffset(ifd0Offset, 0x8769);

                    if (exifIfdOffset) {
                        const dtOrig = readAsciiTag(exifIfdOffset, 0x9003);
                        if (dtOrig) {
                            const iso = parseExifDateString(dtOrig);
                            if (iso) return iso;
                        }
                        const dtDig = readAsciiTag(exifIfdOffset, 0x9004);
                        if (dtDig) {
                            const iso = parseExifDateString(dtDig);
                            if (iso) return iso;
                        }
                    }

                    const dt0 = readAsciiTag(ifd0Offset, 0x0132);
                    if (dt0) {
                        const iso = parseExifDateString(dt0);
                        if (iso) return iso;
                    }
                }
            }
            offset += segLen;
        }
    } catch (e) {
        console.warn('EXIF-luku epäonnistui:', e);
    }
    return null;
}

async function extractPhotoCaptureTimestamp(file) {
    if (!file) return { iso: new Date().toISOString(), source: 'Nykyhetki' };

    // 1. Kokeillaan exifr-kirjastoa (tukee JPEG, HEIC, WebP, PNG, TIFF)
    if (typeof exifr !== 'undefined' && typeof exifr.parse === 'function') {
        try {
            const meta = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'DateTimeDigitized', 'DateTime']);
            if (meta) {
                const raw = meta.DateTimeOriginal || meta.CreateDate || meta.DateTimeDigitized || meta.DateTime;
                const iso = parseExifDateString(raw);
                if (iso) return { iso, source: 'EXIF-metatieto' };
            }
        } catch (e) {}
    }

    // 2. Sisäänrakennettu binäärinen JPEG EXIF -lukija (toimii 100 % offline)
    if (typeof file.arrayBuffer === 'function') {
        try {
            const buf = await file.arrayBuffer();
            const iso = parseJpegExifDateFromBuffer(buf);
            if (iso) return { iso, source: 'EXIF-metatieto' };
        } catch (e) {}
    }

    // 3. Tiedoston oma luonti-/muokkausaika laitteella (file.lastModified)
    if (typeof file.lastModified === 'number' && file.lastModified > 0) {
        const d = new Date(file.lastModified);
        if (!isNaN(d.getTime())) {
            return { iso: d.toISOString(), source: 'Kuvatiedoston metatieto' };
        }
    }

    return { iso: new Date().toISOString(), source: 'Kuvaushetki' };
}

function getPhotoCaptureIso(photo) {
    if (!photo) return '';
    return photo.capturedAt || photo.timestamp || '';
}

function quickSnapPhoto(taskId) {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    openPhotoCapture({
        taskId: t.id,
        customerId: t.customerId || null,
        customerName: t.name,
        address: t.address
    });
}

function openPhotoCapture(context) {
    pendingPhotoContext = context || {};
    currentPhotoBase64 = null;
    currentPhotoCapturedAt = null;
    currentPhotoTimeSource = '';
    const title = pendingPhotoContext.customerName
        ? `📷 Valokuva: ${pendingPhotoContext.customerName}`
        : '📷 Lisää valokuva kohteesta';
    document.getElementById('photoDialogTitle').textContent = title;
    document.getElementById('photoDialogSubtitle').textContent = pendingPhotoContext.address || '';
    document.getElementById('photoNotesInput').value = '';
    document.getElementById('photoPreviewBox').style.display = 'none';
    document.getElementById('photoPreviewImg').src = '';
    document.getElementById('photoFileInput').value = '';
    const metaInfo = document.getElementById('photoMetaTimeInfo');
    if (metaInfo) {
        metaInfo.style.display = 'none';
        metaInfo.textContent = '';
    }

    const firstRadio = document.querySelector('input[name="photoTag"][value="Valmis auraus"]');
    if (firstRadio) firstRadio.checked = true;

    const dlg = document.getElementById('photoCaptureDialog');
    dlg.returnValue = '';
    dlg.showModal();
}

async function handlePhotoFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showStatus('Käsitellään kuvaa ja luetaan kuvausaika metadatasta...', 'loading');
    try {
        const [metaResult, compressed] = await Promise.all([
            extractPhotoCaptureTimestamp(file),
            compressImage(file, 1280, 0.75)
        ]);
        currentPhotoBase64 = compressed;
        currentPhotoCapturedAt = metaResult.iso;
        currentPhotoTimeSource = metaResult.source;

        const previewBox = document.getElementById('photoPreviewBox');
        const previewImg = document.getElementById('photoPreviewImg');
        previewImg.src = compressed;
        previewBox.style.display = 'block';

        const metaInfo = document.getElementById('photoMetaTimeInfo');
        if (metaInfo) {
            metaInfo.textContent = `🕒 Kuvan ottoaika: ${fmtDateTime(currentPhotoCapturedAt)} (${currentPhotoTimeSource})`;
            metaInfo.style.display = 'block';
        }

        showStatus('Kuva ja sen ottoaika ladattu onnistuneesti!', 'success');
    } catch (err) {
        console.error(err);
        showStatus('Kuvan käsittely epäonnistui: ' + esc(err.message), 'info');
    }
}

async function savePhotoFromDialog() {
    if (!currentPhotoBase64) {
        alert('Ota ensin kuva tai valitse kuva laitteeltasi painamalla "Ota kuva tai valitse galleriasta"!');
        return;
    }
    const tag = document.querySelector('input[name="photoTag"]:checked')?.value || 'Valmis auraus';
    const notes = document.getElementById('photoNotesInput').value.trim();
    const captureIso = currentPhotoCapturedAt || new Date().toISOString();

    const photoObj = {
        id: newId(),
        timestamp: captureIso,
        capturedAt: captureIso,
        addedAt: new Date().toISOString(),
        timeSource: currentPhotoTimeSource || 'Metatieto',
        customerId: pendingPhotoContext.customerId || null,
        customerName: pendingPhotoContext.customerName || '',
        address: pendingPhotoContext.address || '',
        taskId: pendingPhotoContext.taskId || null,
        logId: pendingPhotoContext.logId || null,
        tag,
        notes,
        dataUrl: currentPhotoBase64
    };

    try {
        await dbSavePhoto(photoObj);
        document.getElementById('photoCaptureDialog').close('ok');
        await updatePhotoCounts();

        if (activeGalleryCustomerId) {
            await renderCustomerGallery(activeGalleryCustomerId);
        }
        if (document.getElementById('viewLogs').style.display !== 'none') {
            renderWorkLogs();
        }
        showStatus(`Valokuva tallennettu (ottoaika: ${fmtDateTime(captureIso)})! 📷`, 'success');
    } catch (err) {
        console.error(err);
        alert('Kuvan tallennus epäonnistui: ' + err.message);
    }
}

async function openCustomerPhotos(cidOrName) {
    activeGalleryCustomerId = cidOrName;
    const dlg = document.getElementById('photoGalleryDialog');
    let title = 'Kohteen valokuvat';
    let sub = '';

    const cust = customers.find(c => String(c.id) === String(cidOrName) || (c.name && c.name.toLowerCase() === String(cidOrName).toLowerCase()));
    if (cust) {
        activeGalleryCustomerName = cust.name;
        activeGalleryAddress = cust.address;
        title = `📷 Valokuvat: ${cust.name}`;
        sub = cust.address;
    } else {
        activeGalleryCustomerName = String(cidOrName);
        activeGalleryAddress = '';
        title = `📷 Valokuvat: ${cidOrName}`;
    }

    document.getElementById('galleryTitle').textContent = title;
    document.getElementById('gallerySubtitle').textContent = sub;
    await renderCustomerGallery(cidOrName);
    dlg.showModal();
}

function openAddPhotoForCurrentGallery() {
    openPhotoCapture({
        customerId: activeGalleryCustomerId,
        customerName: activeGalleryCustomerName,
        address: activeGalleryAddress
    });
}

async function renderCustomerGallery(cidOrName) {
    const grid = document.getElementById('galleryPhotoGrid');
    grid.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">Ladataan kuvia...</p>';

    const all = await dbGetAllPhotos();
    const photos = all.filter(p => {
        if (!cidOrName) return true;
        return String(p.customerId) === String(cidOrName) ||
               (p.customerName && p.customerName.toLowerCase() === String(cidOrName).toLowerCase());
    });
    photos.sort((a, b) => new Date(getPhotoCaptureIso(b)) - new Date(getPhotoCaptureIso(a)));

    if (photos.length === 0) {
        grid.innerHTML = '<p class="empty-state">Tälle kohteelle ei ole vielä tallennettu valokuvia. Ota uusi kuva yllä olevasta painikkeesta!</p>';
        return;
    }

    grid.innerHTML = photos.map(p => {
        const shotTime = fmtDateTime(getPhotoCaptureIso(p));
        return `
            <div class="photo-card">
                <div class="photo-thumb-wrap" onclick="openLightbox(${p.id})">
                    <img src="${p.dataUrl}" class="photo-thumb" alt="${esc(p.tag)}">
                    <span class="photo-tag-badge">${esc(p.tag)}</span>
                </div>
                <div class="photo-body">
                    <div class="photo-time">📷 Kuvausaika: ${esc(shotTime)}</div>
                    ${p.notes ? `<div class="photo-notes">${esc(p.notes)}</div>` : ''}
                    <div class="photo-actions">
                        <button class="tiny-btn" type="button" onclick="openLightbox(${p.id})">🔎 Avaa</button>
                        <button class="tiny-btn" type="button" onclick="sharePhotoById(${p.id})">📤 Jaa</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openLightbox(photoId) {
    const all = await dbGetAllPhotos();
    const photo = all.find(p => String(p.id) === String(photoId));
    if (!photo) return;
    currentLightboxPhoto = photo;

    const shotTime = fmtDateTime(getPhotoCaptureIso(photo));
    document.getElementById('lightboxImg').src = photo.dataUrl;
    document.getElementById('lightboxTag').textContent = `${photo.tag} · ${photo.customerName || ''}`;
    document.getElementById('lightboxTime').textContent = `📷 Kuvausaika: ${shotTime} · ${photo.address || ''}`;
    document.getElementById('lightboxNotes').textContent = photo.notes || '';
    document.getElementById('lightboxModal').style.display = 'flex';
}

function closeLightbox(e) {
    if (e && e.target !== document.getElementById('lightboxModal') && !e.target.classList.contains('btn-secondary')) {
        return;
    }
    document.getElementById('lightboxModal').style.display = 'none';
    currentLightboxPhoto = null;
}

async function shareCurrentLightboxPhoto() {
    if (currentLightboxPhoto) await sharePhoto(currentLightboxPhoto);
}
async function sharePhotoById(photoId) {
    const all = await dbGetAllPhotos();
    const photo = all.find(p => String(p.id) === String(photoId));
    if (photo) await sharePhoto(photo);
}

async function sharePhoto(photo) {
    if (!photo || !photo.dataUrl) return;
    const shotIso = getPhotoCaptureIso(photo);
    try {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const filename = `auraus-${(photo.customerName || 'kuva').replace(/[^a-z0-9]/gi, '_')}-${shotIso.slice(0, 10)}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: `Aurauskuva: ${photo.customerName || ''}`,
                text: `${photo.tag || 'Auraustyö'} - ${photo.customerName || ''} (${photo.address || ''}) Kuvausaika: ${fmtDateTime(shotIso)}. ${photo.notes || ''}`,
                files: [file]
            });
            showStatus('Kuva jaettu onnistuneesti!', 'success');
            return;
        }
    } catch (e) {
        if (e.name !== 'AbortError') console.warn('Web Share ei onnistunut tiedostolla:', e);
    }
    downloadPhoto(photo);
}

function downloadCurrentLightboxPhoto() {
    if (currentLightboxPhoto) downloadPhoto(currentLightboxPhoto);
}

function downloadPhoto(photo) {
    const shotIso = getPhotoCaptureIso(photo);
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `auraus-${(photo.customerName || 'kuva').replace(/[^a-z0-9]/gi, '_')}-${shotIso.slice(0, 10)}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showStatus('Kuva ladattu laitteelle!', 'success');
}

async function deleteCurrentLightboxPhoto() {
    if (!currentLightboxPhoto) return;
    if (!confirm('Haluatko varmasti poistaa tämän valokuvan? Tätä ei voi perua.')) return;
    await dbDeletePhoto(currentLightboxPhoto.id);
    closeLightbox();
    await updatePhotoCounts();
    if (activeGalleryCustomerId) {
        await renderCustomerGallery(activeGalleryCustomerId);
    }
    if (document.getElementById('viewLogs').style.display !== 'none') {
        renderWorkLogs();
    }
    showStatus('Valokuva poistettu.', 'info');
}

// Työloki ja raportit
function updateWorkLogBadges() {
    const badge = document.getElementById('logCountBadge');
    if (badge) badge.textContent = workLogs.length;
    const headerCount = document.getElementById('logCountHeader');
    if (headerCount) headerCount.textContent = workLogs.length;
}

function addWorkLogEntry(data) {
    const entry = {
        id: data.id || newId(),
        timestamp: data.timestamp || data.completed_at || new Date().toISOString(),
        completed_at: data.completed_at || data.timestamp || new Date().toISOString(),
        customerId: data.customerId || null,
        customerName: data.customerName || '',
        address: data.address || '',
        type: data.type || 'Auraus & Hiekoitus',
        sepeliQty: (data.sepeliQty != null && !isNaN(data.sepeliQty)) ? Number(data.sepeliQty) : 0,
        notes: data.notes || '',
        contractType: data.contractType || '',
        paymentMethod: data.paymentMethod || '',
        completed: data.completed !== undefined ? !!data.completed : true,
        verified_on_site: data.verified_on_site !== undefined ? !!data.verified_on_site : false,
        manual_override: data.manual_override !== undefined ? !!data.manual_override : false,
        override_reason: data.override_reason || null,
        override_distance_meters: (data.override_distance_meters != null && !isNaN(data.override_distance_meters)) ? Math.round(Number(data.override_distance_meters)) : null,
        manager_alert: data.manager_alert !== undefined ? !!data.manager_alert : !!data.manual_override
    };
    workLogs.unshift(entry);
    persistWorkLogs();
    if (document.getElementById('viewLogs').style.display !== 'none') {
        renderWorkLogs();
    }
    return entry;
}

function openNewLogModal() {
    const custSel = document.getElementById('manualLogCustomer');
    custSel.innerHTML = '<option value="">-- Valitse asiakas tai syötä käsin alle --</option>' +
        customers.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.address)})</option>`).join('');

    const now = new Date();
    document.getElementById('manualLogDate').value = now.toISOString().slice(0, 10);
    document.getElementById('manualLogTime').value = now.toTimeString().slice(0, 5);
    document.getElementById('manualLogName').value = '';
    document.getElementById('manualLogAddress').value = '';
    const sepeliInput = document.getElementById('manualLogSepeli');
    if (sepeliInput) sepeliInput.value = '0';
    document.getElementById('manualLogNotes').value = '';

    const dlg = document.getElementById('addLogDialog');
    dlg.returnValue = '';
    dlg.showModal();
}

function fillManualLogAddress(custId) {
    if (!custId) return;
    const c = customers.find(x => String(x.id) === String(custId));
    if (c) {
        document.getElementById('manualLogName').value = c.name;
        document.getElementById('manualLogAddress').value = c.address;
        if (c.defaultType) document.getElementById('manualLogType').value = c.defaultType;
    }
}

function saveManualLogEntry() {
    const name = document.getElementById('manualLogName').value.trim();
    const address = document.getElementById('manualLogAddress').value.trim();
    const date = document.getElementById('manualLogDate').value;
    const time = document.getElementById('manualLogTime').value;
    const type = document.getElementById('manualLogType').value;
    const sepeliQty = parseFloat(document.getElementById('manualLogSepeli').value) || 0;
    const notes = document.getElementById('manualLogNotes').value.trim();
    const custId = document.getElementById('manualLogCustomer').value;

    if (!name || !address || !date || !time) {
        alert('Täytä vähintään nimi, osoite, päivämäärä ja kellonaika!');
        return;
    }

    const iso = new Date(`${date}T${time}:00`).toISOString();
    const c = customers.find(x => String(x.id) === String(custId));

    addWorkLogEntry({
        id: newId(),
        timestamp: iso,
        customerId: custId || (c ? c.id : null),
        customerName: name,
        address: address,
        type: type,
        sepeliQty: sepeliQty,
        notes: notes,
        contractType: c ? c.contractType : '',
        paymentMethod: c ? c.paymentMethod : ''
    });

    document.getElementById('addLogDialog').close('ok');
    showStatus(`Uusi merkintä tallennettu kohteelle "${esc(name)}"!`, 'success');
}

function deleteWorkLog(id) {
    if (confirm('Haluatko varmasti poistaa tämän lokirivin?')) {
        workLogs = workLogs.filter(l => String(l.id) !== String(id));
        persistWorkLogs();
        renderWorkLogs();
        showStatus('Lokirivi poistettu.', 'info');
    }
}

async function renderWorkLogs() {
    const listEl = document.getElementById('workLogList');
    if (!listEl) return;
    updateWorkLogBadges();

    const custFilterSel = document.getElementById('logFilterCustomer');
    const curCustVal = custFilterSel.value;
    const uniqueCustNames = [...new Set([
        ...customers.map(c => c.name),
        ...workLogs.map(l => l.customerName)
    ])].filter(Boolean);

    custFilterSel.innerHTML = '<option value="">-- Kaikki asiakkaat --</option>' +
        uniqueCustNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    custFilterSel.value = curCustVal;

    const filterCust = custFilterSel.value.toLowerCase().trim();
    const filterPeriod = document.getElementById('logFilterPeriod').value;
    const search = (document.getElementById('logSearchInput')?.value || '').toLowerCase().trim();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const msWeek = 7 * 24 * 60 * 60 * 1000;
    const msMonth = 30 * 24 * 60 * 60 * 1000;

    const filtered = workLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const logDateStr = log.timestamp ? log.timestamp.slice(0, 10) : '';

        if (filterCust && (log.customerName || '').toLowerCase() !== filterCust) return false;

        if (filterPeriod === 'today' && logDateStr !== todayStr) return false;
        if (filterPeriod === 'week' && (now - logDate) > msWeek) return false;
        if (filterPeriod === '30days' && (now - logDate) > msMonth) return false;
        if (filterPeriod === 'month') {
            if (logDate.getFullYear() !== now.getFullYear() || logDate.getMonth() !== now.getMonth()) return false;
        }

        if (search) {
            const match = (log.customerName && log.customerName.toLowerCase().includes(search)) ||
                          (log.address && log.address.toLowerCase().includes(search)) ||
                          (log.notes && log.notes.toLowerCase().includes(search)) ||
                          (log.override_reason && log.override_reason.toLowerCase().includes(search)) ||
                          (log.type && log.type.toLowerCase().includes(search));
            if (!match) return false;
        }

        return true;
    });

    if (workLogs.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Työlokissa ei ole vielä merkintöjä. Kohteet kirjataan automaattisesti työlokiin, kun kuittaat ne ajolistalta valmiiksi, tai voit lisätä merkinnän "➕ Uusi merkintä" -painikkeesta.</p>';
        return;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Valituilla rajauksilla ei löytynyt lokimerkintöjä.</p>';
        return;
    }

    const allPhotos = await dbGetAllPhotos();

    listEl.innerHTML = filtered.map(log => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(log.address)}`;
        const logPhotos = allPhotos.filter(p => {
            if (p.logId && String(p.logId) === String(log.id)) return true;
            const pShotDay = getPhotoCaptureIso(p).slice(0, 10);
            const pAddedDay = (p.addedAt || '').slice(0, 10);
            const lDay = (log.timestamp || '').slice(0, 10);
            if (p.customerId && log.customerId && String(p.customerId) === String(log.customerId)) {
                return lDay && (pShotDay === lDay || pAddedDay === lDay);
            }
            if (p.customerName && log.customerName && p.customerName.toLowerCase() === log.customerName.toLowerCase()) {
                return lDay && (pShotDay === lDay || pAddedDay === lDay);
            }
            return false;
        });

        const photosHtml = logPhotos.length > 0 ? `
            <div style="margin-top: 6px;">
                <div style="font-size: 0.72rem; color: var(--muted); margin-bottom: 4px;">📷 Liitetyt valokuvat (${logPhotos.length} kpl):</div>
                <div class="log-photos" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${logPhotos.map(p => `
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                            <img src="${p.dataUrl}" class="log-photo-mini" title="${esc(p.tag)} (${esc(fmtDateTime(getPhotoCaptureIso(p)))}) - ${esc(p.notes || '')}" onclick="openLightbox(${p.id})">
                            <span style="font-size: 0.68rem; color: var(--muted);">🕒 ${esc(fmtDateTime(getPhotoCaptureIso(p)))}</span>
                        </div>
                    `).join('')}
                </div>
            </div>` : '';

        const payTag = log.paymentMethod ? `<span class="tag-pill tag-payment">${log.paymentMethod === 'Laskutus' ? '💳' : '💵'} ${esc(log.paymentMethod)}</span>` : '';
        const conTag = log.contractType ? `<span class="tag-pill tag-contract">📋 ${esc(log.contractType)}</span>` : '';
        const sepeliTag = (log.sepeliQty && Number(log.sepeliQty) > 0) ? `<span class="tag-pill tag-sepeli">🪨 ${log.sepeliQty} kg sepeliä</span>` : '';

        let geofenceTag = '';
        let managerAlertHtml = '';
        let logBorderColor = '';
        if (log.blocked) {
            const reasonText = log.blocked_reason || log.notes || 'Ei ilmoitettua syytä';
            geofenceTag = `<span class="manager-alert-pill" style="background: rgba(239, 68, 68, 0.2); color: #f43f5e; border-color: rgba(239, 68, 68, 0.5);" title="Kohteeseen ei päästy: ${esc(reasonText)}">🚫 Estynyt</span>`;
            managerAlertHtml = `
                <div class="blocked-alert-banner" title="Esimieshuomio: Kohteeseen ei päästy tekemään">
                    <span>🚫</span>
                    <div>
                        <strong style="color: #f43f5e;">Este kohteessa (Ilmoitus työnjohdolle):</strong> ${esc(reasonText)}
                    </div>
                </div>`;
            logBorderColor = 'border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.05);';
        } else if (log.manual_override || log.manager_alert) {
            const distSuffix = (log.override_distance_meters != null) ? ` (${log.override_distance_meters} m kohteesta)` : '';
            const reasonText = log.override_reason || 'Ei ilmoitettua syytä';
            geofenceTag = `<span class="manager-alert-pill" title="Manuaalinen poikkeuskuittaus: ${esc(reasonText)}${esc(distSuffix)}">⚠️ Kuitattu manuaalisesti</span>`;
            managerAlertHtml = `
                <div class="manager-alert-banner" title="Esimieshuomio: Kuljettaja kuittasi kohteen geofence-alueen ulkopuolelta">
                    <span>⚠️</span>
                    <div>
                        <strong>Esimieshuomio (Manuaalikuittaus${esc(distSuffix)}):</strong> ${esc(reasonText)}
                    </div>
                </div>`;
            logBorderColor = 'border-left: 4px solid var(--accent-amber);';
        } else if (log.verified_on_site) {
            const distSuffix = (log.override_distance_meters != null) ? ` (${log.override_distance_meters} m)` : '';
            geofenceTag = `<span class="geofence-verified-pill" title="Paikkatodennus vahvistettu kohteessa${esc(distSuffix)}">🛰️ Paikkatodennettu ✓</span>`;
        }

        return `
            <div class="log-item" style="${logBorderColor}">
                <div class="log-header">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span class="log-title">${esc(log.customerName)}</span>
                        <span class="badge">${esc(log.type)}</span>
                        ${geofenceTag}
                    </div>
                    <span class="log-timestamp">⏱️ ${esc(fmtDateTime(log.timestamp))}</span>
                </div>

                <div class="log-meta">
                    <a href="${mapsUrl}" target="_blank" rel="noopener">📍 ${esc(log.address)}</a>
                </div>

                ${(payTag || conTag || sepeliTag) ? `<div class="customer-tags" style="margin: 2px 0;">${payTag} ${conTag} ${sepeliTag}</div>` : ''}

                ${managerAlertHtml}
                ${log.notes ? `<div class="task-notes" style="margin-top: 4px;">💬 <strong>Huomio:</strong> ${esc(log.notes)}</div>` : ''}

                ${photosHtml}

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; border-top: 1px dashed var(--border); padding-top: 8px;">
                    <div style="display: flex; gap: 6px;">
                        <button class="photo-btn" type="button" onclick="openPhotoCapture({ customerId: ${log.customerId || 'null'}, customerName: '${esc(log.customerName)}', address: '${esc(log.address)}', logId: ${log.id} })">
                            📷 Ota kuva
                        </button>
                        <button class="tiny-btn" type="button" onclick="openCustomerPhotos(${log.customerId || `'${esc(log.customerName)}'`})">
                            🖼️ Kaikki kuvat
                        </button>
                    </div>
                    <button class="tiny-btn danger" type="button" onclick="deleteWorkLog(${log.id})" title="Poista lokimerkintä">✕ Poista</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterLogsToday() {
    document.getElementById('logFilterPeriod').value = 'today';
    renderWorkLogs();
}

async function generateAndPrintPDF(directDownload = false) {
    const custFilterVal = document.getElementById('logFilterCustomer').value;
    let filterPeriod = document.getElementById('logFilterPeriod').value;
    const search = (document.getElementById('logSearchInput')?.value || '').toLowerCase().trim();

    const periodMap = {
        'all': 'Kaikki tapahtumat',
        'today': 'Tämän päivän työt',
        'week': 'Viimeiset 7 päivää',
        'month': 'Tämä kuukausi',
        '30days': 'Viimeiset 30 päivää'
    };
    let periodText = periodMap[filterPeriod] || 'Valittu aikaväli';

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const msWeek = 7 * 24 * 60 * 60 * 1000;
    const msMonth = 30 * 24 * 60 * 60 * 1000;

    const filterFn = (log, period) => {
        const logDate = new Date(log.timestamp);
        const logDateStr = log.timestamp ? log.timestamp.slice(0, 10) : '';

        if (custFilterVal && (log.customerName || '').toLowerCase() !== custFilterVal.toLowerCase()) return false;
        if (period === 'today' && logDateStr !== todayStr) return false;
        if (period === 'week' && (now - logDate) > msWeek) return false;
        if (period === '30days' && (now - logDate) > msMonth) return false;
        if (period === 'month') {
            if (logDate.getFullYear() !== now.getFullYear() || logDate.getMonth() !== now.getMonth()) return false;
        }
        if (search) {
            const match = (log.customerName && log.customerName.toLowerCase().includes(search)) ||
                          (log.address && log.address.toLowerCase().includes(search)) ||
                          (log.notes && log.notes.toLowerCase().includes(search)) ||
                          (log.type && log.type.toLowerCase().includes(search));
            if (!match) return false;
        }
        return true;
    };

    let filteredLogs = workLogs.filter(log => filterFn(log, filterPeriod));

    // Jos valitulla aikavälillä ei ole merkintöjä, mutta muilta ajoilta löytyy, otetaan kaikki ajat mukaan
    if (filteredLogs.length === 0 && filterPeriod !== 'all' && workLogs.length > 0) {
        const allMatching = workLogs.filter(log => filterFn(log, 'all'));
        if (allMatching.length > 0) {
            filteredLogs = allMatching;
            filterPeriod = 'all';
            periodText = 'Kaikki tapahtumat';
            const periodSel = document.getElementById('logFilterPeriod');
            if (periodSel) periodSel.value = 'all';
            renderWorkLogs();
        }
    }

    // Jos työloki on kokonaan tyhjä, mutta ajolistalla (tasks) on kohteita, muodostetaan raportti ajolistan kohteista
    if (filteredLogs.length === 0 && tasks.length > 0) {
        filteredLogs = tasks
            .filter(t => !custFilterVal || (t.name || '').toLowerCase() === custFilterVal.toLowerCase())
            .map(t => ({
                id: t.id,
                customerName: t.name,
                address: t.address,
                type: t.type || 'Auraus & Hiekoitus',
                notes: t.notes ? `${t.done ? '✓ Valmis – ' : ''}${t.notes}` : (t.done ? '✓ Suoritettu' : 'Ajolistalla'),
                timestamp: t.completedAt || now.toISOString()
            }));
        periodText = 'Ajolistan kohteet';
    }

    if (filteredLogs.length === 0) {
        alert('Ei lokimerkintöjä tai kohteita PDF-raporttia varten! Lisää ensin merkintä työlokiin ("➕ Uusi merkintä") tai kuittaa kohde ajolistalta valmiiksi.');
        return;
    }

    const allPhotos = await dbGetAllPhotos();
    const relevantPhotos = allPhotos.filter(p => {
        if (custFilterVal) {
            return (p.customerName && p.customerName.toLowerCase() === custFilterVal.toLowerCase());
        }
        const pShotDay = getPhotoCaptureIso(p).slice(0, 10);
        const pAddedDay = (p.addedAt || '').slice(0, 10);
        return filteredLogs.some(l => {
            if (p.logId && String(p.logId) === String(l.id)) return true;
            const lDay = (l.timestamp || '').slice(0, 10);
            if (p.customerId && l.customerId && String(p.customerId) === String(l.customerId)) {
                return lDay && (pShotDay === lDay || pAddedDay === lDay);
            }
            if (p.customerName && l.customerName && p.customerName.toLowerCase() === l.customerName.toLowerCase()) {
                return lDay && (pShotDay === lDay || pAddedDay === lDay);
            }
            return false;
        });
    });
    relevantPhotos.sort((a, b) => new Date(getPhotoCaptureIso(a)) - new Date(getPhotoCaptureIso(b)));

    const totalVisits = filteredLogs.length;
    const plowingCount = filteredLogs.filter(l => (l.type || '').toLowerCase().includes('auraus')).length;
    const sandingCount = filteredLogs.filter(l => (l.type || '').toLowerCase().includes('hiekoitus')).length;

    const singleCust = custFilterVal ? customers.find(c => c.name.toLowerCase() === custFilterVal.toLowerCase()) : null;

    const htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
            <div>
                <h1 style="margin: 0; font-size: 20pt; color: #0f172a; letter-spacing: -0.5px;">🌿 YardFlow</h1>
                <div style="font-size: 10pt; color: #64748b; font-weight: 600;">KIINTEISTÖ- JA PIHATYÖPALVELU · TOIMENPIDEPÖYTÄKIRJA</div>
            </div>
            <div style="text-align: right; font-size: 9.5pt; color: #475569;">
                <div><strong>Raportin luotu:</strong> ${fmtDateTime(now.toISOString())}</div>
                <div><strong>Aikajakso:</strong> ${esc(periodText)}</div>
            </div>
        </div>

        <div style="margin-top: 16px; background: #f8fafc; border: 1px solid #e2e8f8; padding: 12px 14px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                    <div style="font-size: 8.5pt; text-transform: uppercase; color: #64748b; font-weight: 700;">Raportin kohde / Asiakas:</div>
                    <div style="font-size: 13pt; font-weight: 700; color: #0f172a;">${esc(custFilterVal || 'Kaikki kohteet (Yhteenvetoraportti)')}</div>
                    ${singleCust ? `<div style="font-size: 10pt; color: #334155; margin-top: 2px;">📍 ${esc(singleCust.address)} · 📞 ${esc(singleCust.phone || '-')}</div>` : ''}
                </div>
                ${singleCust ? `
                <div style="text-align: right;">
                    <div style="font-size: 8.5pt; text-transform: uppercase; color: #64748b; font-weight: 700;">Sopimustiedot:</div>
                    <div style="font-size: 10pt; color: #0f172a;"><strong>Sopimus:</strong> ${esc(singleCust.contractType || '-')}</div>
                    <div style="font-size: 10pt; color: #0f172a;"><strong>Maksutapa:</strong> ${esc(singleCust.paymentMethod || '-')}</div>
                </div>` : ''}
            </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 14px;">
            <div style="flex: 1; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; background: #fff;">
                <div style="font-size: 8.5pt; color: #64748b;">Suoritetut käynnit</div>
                <div style="font-size: 16pt; font-weight: 800; color: #0f172a;">${totalVisits} kpl</div>
            </div>
            <div style="flex: 1; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; background: #fff;">
                <div style="font-size: 8.5pt; color: #64748b;">Aurauskäynnit</div>
                <div style="font-size: 16pt; font-weight: 800; color: #0284c7;">${plowingCount} kpl</div>
            </div>
            <div style="flex: 1; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; background: #fff;">
                <div style="font-size: 8.5pt; color: #64748b;">Hiekoitukset</div>
                <div style="font-size: 16pt; font-weight: 800; color: #10b981;">${sandingCount} kpl</div>
            </div>
            <div style="flex: 1; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; background: #fff;">
                <div style="font-size: 8.5pt; color: #64748b;">Kuvadokumentit</div>
                <div style="font-size: 16pt; font-weight: 800; color: #8b5cf6;">${relevantPhotos.length} kpl</div>
            </div>
        </div>

        <h3 style="margin-top: 22px; margin-bottom: 8px; font-size: 12pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
            Suoritetut toimenpiteet ja aikaleimat
        </h3>

        <table class="print-table">
            <thead>
                <tr>
                    <th style="width: 140px;">Päivämäärä &amp; Aika</th>
                    <th>Kohde &amp; Osoite</th>
                    <th style="width: 150px;">Toimenpide</th>
                    <th>Kuljettajan huomiot &amp; havainnot</th>
                </tr>
            </thead>
            <tbody>
                ${filteredLogs.map(l => `
                    <tr>
                        <td style="font-weight: 600; white-space: nowrap;">${esc(fmtDateTime(l.timestamp))}</td>
                        <td><strong>${esc(l.customerName)}</strong><br><span style="font-size: 9pt; color: #64748b;">${esc(l.address)}</span></td>
                        <td>${esc(l.type)}${l.sepeliQty && Number(l.sepeliQty) > 0 ? `<br><span style="font-size: 8.5pt; color: #475569;">Sepeli: ${l.sepeliQty} kg</span>` : ''}</td>
                        <td>${esc(l.notes || '-')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${relevantPhotos.length > 0 ? `
            <div style="page-break-before: auto; margin-top: 26px;">
                <h3 style="margin-top: 22px; margin-bottom: 8px; font-size: 12pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                    Valokuvadokumentaatio kohteesta (${relevantPhotos.length} kuvaa)
                </h3>
                <p style="font-size: 9pt; color: #64748b; margin-top: 2px; margin-bottom: 10px;">
                    Alla olevat kuvat on taltioitu paikan päällä toimenpiteen yhteydessä (todistus tilaajalle tai vakuutusyhtiölle).
                </p>
                <div class="print-photo-grid">
                    ${relevantPhotos.map(p => `
                        <div class="print-photo-card">
                            <img src="${p.dataUrl}" alt="${esc(p.tag)}">
                            <div class="print-photo-caption">
                                <div><strong>[${esc(p.tag)}]</strong> · 📷 Kuvausaika: ${esc(fmtDateTime(getPhotoCaptureIso(p)))}</div>
                                <div><strong>Kohde:</strong> ${esc(p.customerName || '')} (${esc(p.address || '')})</div>
                                ${p.notes ? `<div><strong>Huomio:</strong> ${esc(p.notes)}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div class="print-signature-box">
            <div class="print-sig-line">
                <strong>Toimenpiteiden suorittaja / Kuljettaja:</strong><br><br>
                Allekirjoitus: ____________________________________
            </div>
            <div class="print-sig-line">
                <strong>Vastaanottaja / Tilaaja / Vakuutusyhtiö:</strong><br><br>
                Päiväys &amp; Kuittaus: ________________________________
            </div>
        </div>
    `;

    const safeTarget = (custFilterVal || 'Kaikki_kohteet').replace(/[^a-zA-Z0-9äöåÄÖÅ_-]/g, '_');
    const datePart = now.toISOString().slice(0, 10);
    openPdfPreviewModal(
        `📄 Toimenpideraportti: ${custFilterVal || 'Kaikki kohteet'}`,
        htmlContent,
        `YardFlow_Raportti_${safeTarget}_${datePart}.pdf`,
        directDownload
    );
}

// Asiakasrekisterin hallinta
function updateCustomerBadges() {
    const count = customers.length;
    const badge = document.getElementById('customerCountBadge');
    if (badge) badge.textContent = count;
    const titleCount = document.getElementById('customerCountTitle');
    if (titleCount) titleCount.textContent = count;
    updateQuickCustomerSelect();
}

function updateQuickCustomerSelect() {
    const sel = document.getElementById('quickCustomerSelect');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Valitse asiakas listasta --</option>' +
        customers.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.address)})</option>`).join('');
    sel.value = currentVal;
}

function toggleDrawer(drawerId, btn) {
    const panel = document.getElementById(drawerId);
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || !panel.style.display;

    // Suljetaan muut saman näkymän paneelit, jotta näkymä pysyy siistinä
    if (drawerId === 'addTaskDrawer') {
        const other = document.getElementById('routeConfigDrawer');
        if (other) other.style.display = 'none';
        document.getElementById('btnToggleRouteConfig')?.classList.remove('active');
    } else if (drawerId === 'routeConfigDrawer') {
        const other = document.getElementById('addTaskDrawer');
        if (other) other.style.display = 'none';
        document.getElementById('btnToggleAddTask')?.classList.remove('active');
    }

    panel.style.display = isHidden ? 'block' : 'none';
    const toggleBtn = btn || document.querySelector(`[onclick*="'${drawerId}'"]`);
    if (toggleBtn && toggleBtn.classList.contains('drawer-toggle-btn')) {
        toggleBtn.classList.toggle('active', isHidden);
    }
}

function toggleQuickCustomerPicker() {
    const box = document.getElementById('quickCustomerPickerBox');
    if (!box) return;
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

function pickCustomerToForm(id) {
    if (!id) return;
    const c = customers.find(x => String(x.id) === String(id));
    if (!c) return;
    normalizeGeofenceFields(c);
    document.getElementById('name').value = c.name || '';
    const addrInput = document.getElementById('address');
    addrInput.value = c.address || '';
    delete addrInput.dataset.lat;
    delete addrInput.dataset.lon;
    delete addrInput.dataset.geo;
    delete addrInput.dataset.addr;
    const phoneInput = document.getElementById('taskPhone');
    if (phoneInput) phoneInput.value = c.phone || '';
    const emailInput = document.getElementById('taskEmail');
    if (emailInput) emailInput.value = c.email || '';
    if (c.defaultType) document.getElementById('type').value = c.defaultType;
    if (c.notes) document.getElementById('notes').value = c.notes;

    const gfEn = document.getElementById('taskGeofenceEnabled');
    const gfType = document.getElementById('taskGeofenceType');
    const gfRad = document.getElementById('taskGeofenceRadius');
    const gfRadVal = document.getElementById('taskGeofenceRadiusVal');
    if (gfEn) gfEn.checked = c.geofence_enabled !== false;
    if (gfType) gfType.value = c.geofence_type || 'radius';
    if (gfRad) gfRad.value = c.geofence_radius || 80;
    if (gfRadVal) gfRadVal.textContent = c.geofence_radius || 80;

    document.getElementById('quickCustomerPickerBox').style.display = 'none';
    document.getElementById('quickCustomerSelect').value = '';
    showStatus(`Asiakkaan "${esc(c.name)}" tiedot tuotu lomakkeelle!`, 'success');
}

function addCustomerFromForm() {
    const nameInput = document.getElementById('custName');
    const addrInput = document.getElementById('custAddress');
    const phoneInput = document.getElementById('custPhone');
    const emailInput = document.getElementById('custEmail');
    const typeSelect = document.getElementById('custType');
    const notesInput = document.getElementById('custNotes');

    const monthlyPriceInput = document.getElementById('custMonthlyPrice');
    const plowPriceInput = document.getElementById('custPlowPrice');
    const sandPriceInput = document.getElementById('custSandPrice');
    const gravelPriceInput = document.getElementById('custGravelPrice');

    const gfEn = document.getElementById('custGeofenceEnabled');
    const gfType = document.getElementById('custGeofenceType');
    const gfRad = document.getElementById('custGeofenceRadius');

    const name = nameInput.value.trim();
    const address = addrInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const paymentMethod = document.querySelector('input[name="custPayment"]:checked')?.value || 'Laskutus';
    const contractType = document.querySelector('input[name="custContract"]:checked')?.value || 'Kuukausi + käynnit';

    if (!name || !address) {
        alert('Täytä vähintään asiakkaan nimi ja osoite!');
        return;
    }

    const picked = addrInput.dataset.addr === address && addrInput.dataset.lat;
    const newCust = normalizeGeofenceFields({
        id: newId(),
        name,
        address,
        phone,
        email,
        lat: picked ? parseFloat(addrInput.dataset.lat) : null,
        lon: picked ? parseFloat(addrInput.dataset.lon) : null,
        paymentMethod,
        contractType,
        defaultType: typeSelect.value,
        monthlyPrice: (monthlyPriceInput && monthlyPriceInput.value) ? parseFloat(monthlyPriceInput.value) : null,
        plowPrice: (plowPriceInput && plowPriceInput.value) ? parseFloat(plowPriceInput.value) : null,
        sandPrice: (sandPriceInput && sandPriceInput.value) ? parseFloat(sandPriceInput.value) : null,
        gravelPrice: (gravelPriceInput && gravelPriceInput.value) ? parseFloat(gravelPriceInput.value) : null,
        notes: notesInput.value.trim(),
        geofence_enabled: gfEn ? gfEn.checked : true,
        geofence_type: gfType ? gfType.value : 'radius',
        geofence_radius: gfRad ? Number(gfRad.value) || 80 : 80,
        created: new Date().toISOString()
    });

    customers.unshift(newCust);
    persistCustomers();
    renderCustomers();

    nameInput.value = '';
    addrInput.value = '';
    ['lat', 'lon', 'geo', 'addr'].forEach(k => delete addrInput.dataset[k]);
    if (phoneInput) phoneInput.value = '';
    if (emailInput) emailInput.value = '';
    if (monthlyPriceInput) monthlyPriceInput.value = '';
    if (plowPriceInput) plowPriceInput.value = '';
    if (sandPriceInput) sandPriceInput.value = '';
    if (gravelPriceInput) gravelPriceInput.value = '';
    notesInput.value = '';
    if (gfEn) gfEn.checked = true;
    if (gfType) gfType.value = 'radius';
    if (gfRad) gfRad.value = 80;
    const gfRadVal = document.getElementById('custGeofenceRadiusVal');
    if (gfRadVal) gfRadVal.textContent = '80';

    const custDrawer = document.getElementById('addCustomerDrawer');
    if (custDrawer) custDrawer.style.display = 'none';

    showStatus(`Asiakas "${esc(name)}" lisätty asiakaslistaan!`, 'success');
}

function addCustomerToTodayRoute(customerId) {
    const c = customers.find(x => String(x.id) === String(customerId));
    if (!c) return;
    normalizeGeofenceFields(c);

    const already = tasks.some(t => t.name.toLowerCase() === c.name.toLowerCase() &&
                                    t.address.toLowerCase() === c.address.toLowerCase() && !t.done);
    if (already && !confirm(`Asiakas "${c.name}" on jo tänään ajolistalla tekemättömänä. Lisätäänkö silti uudelleen?`)) {
        return;
    }

    const newTask = normalizeGeofenceFields({
        id: newId(),
        customerId: c.id,
        name: c.name,
        address: c.address,
        phone: c.phone || '',
        email: c.email || '',
        paymentMethod: c.paymentMethod || 'Laskutus',
        contractType: c.contractType || 'Kuukausi + käynnit',
        type: c.defaultType || 'Auraus & Hiekoitus',
        notes: c.notes || '',
        lat: c.lat || null,
        lon: c.lon || null,
        gps: false,
        geoName: '',
        geofence_enabled: c.geofence_enabled !== false,
        geofence_type: c.geofence_type || 'radius',
        geofence_radius: Number(c.geofence_radius) || 80,
        done: false,
        completed: false,
        verified_on_site: false,
        manual_override: false,
        override_reason: null,
        override_distance_meters: null,
        completed_at: null,
        manager_alert: false
    });

    tasks.push(newTask);
    saveAndRender();
    geocodeTask(newTask.id);
    showStatus(`Asiakas "${esc(c.name)}" lisätty tämän päivän ajolistalle! 🚜`, 'success');
    switchTab('routes');

    setTimeout(() => {
        const list = document.getElementById('taskList');
        if (list && list.lastElementChild) {
            list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 150);
}

const editCustDlg = document.getElementById('editCustomerDialog');
const editCustAddressInput = document.getElementById('editCustAddress');

function editCustomer(id) {
    const c = customers.find(x => String(x.id) === String(id));
    if (!c) return;
    normalizeGeofenceFields(c);
    editingCustomerId = id;
    document.getElementById('editCustName').value = c.name || '';
    editCustAddressInput.value = c.address || '';
    ['lat', 'lon', 'geo', 'addr'].forEach(k => delete editCustAddressInput.dataset[k]);
    document.getElementById('editCustPhone').value = c.phone || '';
    document.getElementById('editCustEmail').value = c.email || '';

    const payRadio = document.querySelector(`input[name="editCustPayment"][value="${c.paymentMethod || 'Laskutus'}"]`);
    if (payRadio) payRadio.checked = true;
    const conRadio = document.querySelector(`input[name="editCustContract"][value="${c.contractType || 'Kuukausi + käynnit'}"]`);
    if (conRadio) conRadio.checked = true;

    document.getElementById('editCustType').value = c.defaultType || 'Auraus & Hiekoitus';
    document.getElementById('editCustMonthlyPrice').value = (c.monthlyPrice != null && !isNaN(c.monthlyPrice)) ? c.monthlyPrice : '';
    document.getElementById('editCustPlowPrice').value = (c.plowPrice != null && !isNaN(c.plowPrice)) ? c.plowPrice : '';
    document.getElementById('editCustSandPrice').value = (c.sandPrice != null && !isNaN(c.sandPrice)) ? c.sandPrice : '';
    document.getElementById('editCustGravelPrice').value = (c.gravelPrice != null && !isNaN(c.gravelPrice)) ? c.gravelPrice : '';
    document.getElementById('editCustNotes').value = c.notes || '';

    const gfEn = document.getElementById('editCustGeofenceEnabled');
    const gfType = document.getElementById('editCustGeofenceType');
    const gfRad = document.getElementById('editCustGeofenceRadius');
    const gfRadVal = document.getElementById('editCustGeofenceRadiusVal');
    if (gfEn) gfEn.checked = c.geofence_enabled !== false;
    if (gfType) gfType.value = c.geofence_type || 'radius';
    if (gfRad) gfRad.value = c.geofence_radius || 80;
    if (gfRadVal) gfRadVal.textContent = c.geofence_radius || 80;

    editCustDlg.returnValue = '';
    editCustDlg.showModal();
}

if (editCustDlg) {
    editCustDlg.addEventListener('close', () => {
        const id = editingCustomerId;
        editingCustomerId = null;
        if (editCustDlg.returnValue !== 'ok' || id == null) {
            if (typeof renderYardGeofenceCircle === 'function') renderYardGeofenceCircle();
            return;
        }
        const c = customers.find(x => String(x.id) === String(id));
        if (!c) return;

        c.name = document.getElementById('editCustName').value.trim();
        c.address = editCustAddressInput.value.trim();
        c.phone = document.getElementById('editCustPhone').value.trim();
        c.email = document.getElementById('editCustEmail').value.trim();
        c.paymentMethod = document.querySelector('input[name="editCustPayment"]:checked')?.value || 'Laskutus';
        c.contractType = document.querySelector('input[name="editCustContract"]:checked')?.value || 'Kuukausi + käynnit';
        c.defaultType = document.getElementById('editCustType').value;

        const mVal = document.getElementById('editCustMonthlyPrice').value.trim();
        const pVal = document.getElementById('editCustPlowPrice').value.trim();
        const sVal = document.getElementById('editCustSandPrice').value.trim();
        const gVal = document.getElementById('editCustGravelPrice').value.trim();
        c.monthlyPrice = mVal !== '' ? parseFloat(mVal) : null;
        c.plowPrice = pVal !== '' ? parseFloat(pVal) : null;
        c.sandPrice = sVal !== '' ? parseFloat(sVal) : null;
        c.gravelPrice = gVal !== '' ? parseFloat(gVal) : null;

        c.notes = document.getElementById('editCustNotes').value.trim();

        const gfEn = document.getElementById('editCustGeofenceEnabled');
        const gfType = document.getElementById('editCustGeofenceType');
        const gfRad = document.getElementById('editCustGeofenceRadius');
        c.geofence_enabled = gfEn ? gfEn.checked : true;
        c.geofence_type = gfType ? gfType.value : 'radius';
        c.geofence_radius = gfRad ? Number(gfRad.value) || 80 : 80;

        // Synkronoidaan myös reitillä olevat tämän asiakkaan kohteet
        tasks.forEach(t => {
            if (String(t.customerId) === String(id) || (t.name.toLowerCase() === c.name.toLowerCase())) {
                t.phone = c.phone;
                t.email = c.email;
                t.paymentMethod = c.paymentMethod;
                t.contractType = c.contractType;
                t.geofence_enabled = c.geofence_enabled;
                t.geofence_type = c.geofence_type;
                t.geofence_radius = c.geofence_radius;
            }
        });

        persistCustomers();
        renderCustomers();
        saveAndRender();
        if (typeof syncYardMapGeofenceControls === 'function') syncYardMapGeofenceControls();
        if (typeof renderYardGeofenceCircle === 'function') renderYardGeofenceCircle();
        showStatus(`Asiakkaan "${esc(c.name)}" tiedot ja geofence-asetukset päivitetty!`, 'success');
    });
}

function deleteCustomer(id) {
    const c = customers.find(x => String(x.id) === String(id));
    if (!c) return;
    if (confirm(`Haluatko varmasti poistaa asiakkaan "${c.name}" rekisteristä? (Tämä ei poista jo reitillä olevia kohteita)`)) {
        customers = customers.filter(x => String(x.id) !== String(id));
        persistCustomers();
        renderCustomers();
        showStatus(`Asiakas "${esc(c.name)}" poistettu rekisteristä.`, 'info');
    }
}

function renderCustomers() {
    const listEl = document.getElementById('customerList');
    if (!listEl) return;
    updateCustomerBadges();

    const search = (document.getElementById('custSearchInput')?.value || '').toLowerCase().trim();
    const filtered = customers.filter(c => {
        if (!search) return true;
        return (c.name && c.name.toLowerCase().includes(search)) ||
               (c.address && c.address.toLowerCase().includes(search)) ||
               (c.phone && c.phone.toLowerCase().includes(search)) ||
               (c.email && c.email.toLowerCase().includes(search)) ||
               (c.paymentMethod && c.paymentMethod.toLowerCase().includes(search)) ||
               (c.contractType && c.contractType.toLowerCase().includes(search));
    });

    if (customers.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Ei vielä tallennettuja asiakkaita. Paina yltä "➕ Uusi asiakas" lisätäksesi ensimmäisen!</p>';
        return;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Hakua vastaavia asiakkaita ei löytynyt.</p>';
        return;
    }

    listEl.innerHTML = filtered.map(c => {
        normalizeGeofenceFields(c);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`;
        const phoneHtml = c.phone ? `<a href="tel:${esc(c.phone)}" class="contact-link" title="Soita asiakkaalle">📞 ${esc(c.phone)}</a>` : '';
        const emailHtml = c.email ? `<a href="mailto:${esc(c.email)}" class="contact-link" title="Lähetä sähköpostia">✉️ ${esc(c.email)}</a>` : '';
        const payTag = c.paymentMethod ? `<span class="tag-pill tag-payment">${c.paymentMethod === 'Laskutus' ? '💳' : '💵'} ${esc(c.paymentMethod)}</span>` : '';
        const conTag = c.contractType ? `<span class="tag-pill tag-contract">📋 ${esc(c.contractType)}</span>` : '';

        const gfBadge = c.geofence_enabled !== false
            ? `<span class="tag-pill" title="Vaadi paikkatodennus kohteessa">🛰️ Geofence: ${c.geofence_type === 'polygon' ? 'Karttaraja' : `${c.geofence_radius || 80} m`}</span>`
            : `<span class="tag-pill" style="opacity:0.65;">🛰️ Paikkatodennus: Ei vaadita</span>`;

        const customPrices = [];
        if (c.monthlyPrice != null && Number(c.monthlyPrice) > 0) customPrices.push(`Kk ${c.monthlyPrice}€`);
        if (c.plowPrice != null && Number(c.plowPrice) > 0) customPrices.push(`Auraus ${c.plowPrice}€`);
        if (c.sandPrice != null && Number(c.sandPrice) > 0) customPrices.push(`Hiekoitus ${c.sandPrice}€`);
        if (c.gravelPrice != null && Number(c.gravelPrice) > 0) customPrices.push(`Sepeli ${c.gravelPrice}€/kg`);
        const priceTag = customPrices.length ? `<span class="tag-pill tag-price">🏷️ ${customPrices.join(' · ')}</span>` : '';

        // Tarkistetaan onko asiakkaalla aktiivista esimieshuomiota (manual_override / manager_alert)
        const activeAlertTask = tasks.find(t =>
            (t.manual_override || t.manager_alert) &&
            (String(t.customerId) === String(c.id) || (t.name && t.name.toLowerCase() === c.name.toLowerCase()))
        );
        const hasAlert = !!(activeAlertTask || c.manager_alert || c.manual_override);
        const alertReason = activeAlertTask?.override_reason || c.override_reason || '';
        const alertDist = activeAlertTask?.override_distance_meters ?? c.override_distance_meters;

        const managerAlertHtml = hasAlert ? `
            <div class="manager-alert-banner" title="Esimieshuomio: ${esc(alertReason)}">
                <span>⚠️</span>
                <div>
                    <strong>Poikkeuskuittaus / Esimieshuomio${alertDist != null ? ` (${alertDist} m kohteesta)` : ''}:</strong> ${esc(alertReason || 'Manuaalinen kuittaus alueen ulkopuolelta')}
                </div>
            </div>` : '';

        return `
            <div class="customer-card yard-card" style="${hasAlert ? 'border-left: 4px solid var(--accent-amber);' : ''}">
                <div class="customer-header">
                    <span class="customer-name yard-title" style="margin-bottom: 0;">${esc(c.name)}</span>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        ${hasAlert ? `<span class="manager-alert-pill" title="Manuaalikuittaus: ${esc(alertReason)}">⚠️ Manuaalikuittaus</span>` : ''}
                        <span class="badge badge-active">${esc(c.defaultType || 'Auraus')}</span>
                    </div>
                </div>

                <div class="task-address-row">
                    <a href="${mapsUrl}" target="_blank" rel="noopener" class="yard-address">📍 ${esc(c.address)}</a>
                    ${(phoneHtml || emailHtml) ? `<div class="customer-contacts">${phoneHtml} ${emailHtml}</div>` : ''}
                </div>

                <div class="customer-tags" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${payTag}
                    ${conTag}
                    ${gfBadge}
                    ${priceTag}
                </div>

                ${managerAlertHtml}
                ${c.notes ? `<div class="customer-notes">⚠️ ${esc(c.notes)}</div>` : ''}

                <div class="customer-actions">
                    <button class="btn-primary" style="padding: 8px 14px; min-height: 38px; font-size: 0.82rem; width: auto;" onclick="addCustomerToTodayRoute(${c.id})">
                        🚜 Lisää ajolistalle
                    </button>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="tiny-btn" type="button" onclick="openCustomerOnYardMap(${c.id})" title="Avaa kohteen satelliittikartta ja piirrä piha-alueet">🛰️ Pihakartta</button>
                        <button class="tiny-btn" type="button" onclick="openStreetViewForCustomer(${c.id})" title="Avaa kohde Google Street View -katunäkymässä">🛣️ Avaa Street View</button>
                        <button class="photo-btn" type="button" onclick="openCustomerPhotos(${c.id})" title="Kohteen valokuvat">📷 <span data-photo-count-for="${c.id}">${photoCounts[String(c.id)] || 0}</span></button>
                        <button class="tiny-btn" onclick="editCustomer(${c.id})" title="Muokkaa asiakkaan tietoja">✎ Muokkaa</button>
                        <button class="tiny-btn danger" onclick="deleteCustomer(${c.id})" title="Poista asiakas">✕</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    if (typeof refreshYardMapTargetSelect === 'function') refreshYardMapTargetSelect();
}

// Varikko, suodatus, tilailmoitukset ja kohteen lisäys
const depotInput = document.getElementById('depotAddress');
const returnCheckbox = document.getElementById('returnDepot');
depotInput.value = depot.address || '';
returnCheckbox.checked = localStorage.getItem('pihatyot_return') === '1';
returnCheckbox.addEventListener('change', () => {
    localStorage.setItem('pihatyot_return', returnCheckbox.checked ? '1' : '0');
});

function saveDepot() {
    const val = depotInput.value.trim();
    if (val !== depot.address) {
        depot.address = val;
        depot.lat = null;
        depot.lon = null;
        depot.useGps = false;
    }
    persistDepot();
}

function updateDepotBadge() {
    const el = document.getElementById('depotCoordInfo');
    if (depot.lat && depot.lon) {
        el.innerHTML = `<span class="coord-badge">✓ Koordinaatit tallessa (${depot.lat.toFixed(4)}, ${depot.lon.toFixed(4)})${depot.useGps ? ' – GPS' : ''}</span>`;
    } else if (depot.address) {
        el.innerHTML = `<span class="coord-missing">Koordinaatteja ei vielä haettu (haetaan optimoinnissa)</span>`;
    } else {
        el.innerHTML = '';
    }
}
updateDepotBadge();

function locateDepotGPS() {
    if (!navigator.geolocation) { alert('Laitteesi ei tue GPS-paikannusta.'); return; }
    showStatus('Haetaan nykyistä GPS-sijaintia...', 'loading');
    navigator.geolocation.getCurrentPosition(
        pos => {
            depot.lat = pos.coords.latitude;
            depot.lon = pos.coords.longitude;
            depot.useGps = true;
            if (!depot.address) {
                depot.address = 'Oma GPS-varikko';
                depotInput.value = depot.address;
            }
            persistDepot();
            showStatus('Varikon GPS-sijainti tallennettu!', 'success');
        },
        err => showStatus('GPS-sijainnin haku epäonnistui: ' + esc(err.message) + '. Huom: GPS vaatii yleensä https-yhteyden.', 'info'),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function hasDepot() {
    return !!((depot.useGps && depot.lat && depot.lon) || (depot.address && depot.address.trim()));
}
// Google Mapsille annettava viite: koordinaatit jos GPS-asetettu, muuten osoite
function depotRef() {
    return (depot.useGps && depot.lat && depot.lon) ? `${depot.lat},${depot.lon}` : depot.address;
}
function taskRef(t) {
    return (t.gps && t.lat && t.lon) ? `${t.lat},${t.lon}` : t.address;
}

function saveAndRender() {
    localStorage.setItem('pihatyot_tasks_v4', JSON.stringify(tasks));
    renderTasks();
}

function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTasks();
}

function showStatus(msg, type = 'info') {
    const box = document.getElementById('optimizerStatus');
    box.style.display = 'block';
    box.className = `status-box status-${type}`;
    box.innerHTML = msg;
    clearTimeout(statusTimer);
    if (type !== 'loading') {
        statusTimer = setTimeout(() => { box.style.display = 'none'; }, 7000);
    }
}

// ---------- Kohteiden hallinta ----------
function addTask() {
    const nameInput = document.getElementById('name');
    const addressInput = document.getElementById('address');
    const phoneInput = document.getElementById('taskPhone');
    const emailInput = document.getElementById('taskEmail');
    const typeSelect = document.getElementById('type');
    const notesInput = document.getElementById('notes');
    const gfEn = document.getElementById('taskGeofenceEnabled');
    const gfType = document.getElementById('taskGeofenceType');
    const gfRad = document.getElementById('taskGeofenceRadius');

    const name = nameInput.value.trim();
    const address = addressInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (!name || !address) {
        alert('Täytä vähintään asiakkaan nimi ja osoite!');
        return;
    }

    const picked = addressInput.dataset.addr === address && addressInput.dataset.lat;
    const newTask = normalizeGeofenceFields({
        id: newId(),
        name, address, phone, email,
        type: typeSelect.value,
        notes: notesInput.value.trim(),
        lat: picked ? parseFloat(addressInput.dataset.lat) : null,
        lon: picked ? parseFloat(addressInput.dataset.lon) : null,
        gps: false,
        geoName: picked ? (addressInput.dataset.geo || '') : '',
        geofence_enabled: gfEn ? gfEn.checked : true,
        geofence_type: gfType ? gfType.value : 'radius',
        geofence_radius: gfRad ? Number(gfRad.value) || 80 : 80,
        done: false,
        completed: false,
        verified_on_site: false,
        manual_override: false,
        override_reason: null,
        override_distance_meters: null,
        completed_at: null,
        manager_alert: false
    });

    // Etsitään asiakasrekisteristä maksutapa ja sopimus
    const custMatch = customers.find(c =>
        (c.name && c.name.toLowerCase() === name.toLowerCase()) ||
        (c.address && c.address.toLowerCase() === address.toLowerCase())
    );
    if (custMatch) {
        newTask.customerId = custMatch.id;
        newTask.paymentMethod = custMatch.paymentMethod;
        newTask.contractType = custMatch.contractType;
        if (!newTask.phone && custMatch.phone) newTask.phone = custMatch.phone;
        if (!newTask.email && custMatch.email) newTask.email = custMatch.email;
    }

    tasks.push(newTask);
    nameInput.value = '';
    addressInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (emailInput) emailInput.value = '';
    ['lat', 'lon', 'geo', 'addr'].forEach(k => delete addressInput.dataset[k]);
    notesInput.value = '';
    if (gfEn) gfEn.checked = true;
    if (gfType) gfType.value = 'radius';
    if (gfRad) gfRad.value = 80;
    const gfRadVal = document.getElementById('taskGeofenceRadiusVal');
    if (gfRadVal) gfRadVal.textContent = '80';

    const taskDrawer = document.getElementById('addTaskDrawer');
    if (taskDrawer) taskDrawer.style.display = 'none';
    document.getElementById('btnToggleAddTask')?.classList.remove('active');

    saveAndRender();
    showStatus(`✓ "${esc(name)}" lisätty ajolistalle!`, 'success');
    if (!picked) geocodeTask(newTask.id);
}

// Kohteiden järjestäminen, poisto ja kierroksen nollaus
function deleteTask(id) {
    if (confirm('Haluatko varmasti poistaa tämän kohteen?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveAndRender();
    }
}

function moveTask(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tasks.length) return;
    const item = tasks.splice(index, 1)[0];
    tasks.splice(newIndex, 0, item);
    saveAndRender();
}

function resetAllDone() {
    if (tasks.length === 0) return;
    if (confirm('Haluatko aloittaa uuden aurauskierroksen? Kaikki kohteet palautetaan tilaan "tekemättä".')) {
        tasks = tasks.map(t => ({
            ...t,
            done: false,
            completed: false,
            blocked: false,
            blocked_reason: null,
            blocked_at: null,
            blocked_distance_meters: null,
            verified_on_site: false,
            manual_override: false,
            override_reason: null,
            override_distance_meters: null,
            completed_at: null,
            completedAt: null,
            manager_alert: false
        }));
        saveAndRender();
        showStatus('Aurauskierros nollattu. Kaikki kohteet ovat tekemättöminä.', 'success');
    }
}

function reverseRoute() {
    const pending = tasks.filter(t => !t.done);
    if (pending.length < 2) {
        showStatus('Ei tarpeeksi tekemättömiä kohteita suunnan kääntämiseen.', 'info');
        return;
    }
    pending.reverse();
    tasks = [...pending, ...tasks.filter(t => t.done)];
    saveAndRender();
    showStatus('Reitin kiertosuunta käännetty!', 'success');
}

// Tallennettujen reittien hallinta
// Kysyy nimen <dialog>-ikkunalla (varalla prompt vanhoille selaimille)
function askName(title, value) {
    return new Promise(resolve => {
        const dlg = document.getElementById('nameDialog');
        if (typeof dlg.showModal !== 'function') {
            const v = prompt(title, value || '');
            resolve(v && v.trim() ? v.trim() : null);
            return;
        }
        const inp = document.getElementById('nameDialogInput');
        document.getElementById('nameDialogTitle').textContent = title;
        inp.value = value || '';
        dlg.returnValue = '';
        dlg.addEventListener('close', () => {
            const v = inp.value.trim();
            resolve(dlg.returnValue === 'ok' && v ? v : null);
        }, { once: true });
        dlg.showModal();
        inp.focus();
        inp.select();
    });
}

async function saveRoute() {
    if (tasks.length === 0) {
        showStatus('Lisää ensin kohteita, niin voit tallentaa reitin.', 'info');
        return;
    }
    const cur = getCurrentRoute();
    let asNew = !cur;
    if (cur) {
        asNew = !confirm(`Päivitetäänkö reitti "${cur.name}"?\n\nOK = päivitä tämä reitti\nPeruuta = tallenna uutena reittinä`);
    }
    const defName = asNew
        ? (cur ? `${cur.name} (kopio)` : `Reitti ${fmtDate(new Date().toISOString())}`)
        : cur.name;
    const name = await askName(asNew ? 'Nimeä uusi reitti' : 'Reitin nimi', defName);
    if (!name) return;

    const now = new Date().toISOString();
    const data = {
        name,
        updated: now,
        tasks: JSON.parse(JSON.stringify(tasks)).map(t => ({
            ...t,
            done: false,
            completed: false,
            verified_on_site: false,
            manual_override: false,
            override_reason: null,
            override_distance_meters: null,
            completed_at: null,
            manager_alert: false
        })),
        depot: { ...depot },
        returnToDepot: returnCheckbox.checked
    };
    if (asNew) {
        const route = { id: newId(), created: now, ...data };
        routes.unshift(route);
        currentRouteId = route.id;
    } else {
        Object.assign(cur, data);
    }
    persistRoutes();
    renderRoutes();
    renderActiveRoute();
    showStatus(`Reitti "${esc(name)}" tallennettu (${data.tasks.length} kohdetta).`, 'success');
}

function loadRoute(id) {
    const r = routes.find(x => String(x.id) === String(id));
    if (!r) return;
    if (tasks.length && !confirm(`Ladataanko reitti "${r.name}"? Nykyinen lista korvataan, ja tallentamattomat muutokset menetetään.`)) return;
    tasks = JSON.parse(JSON.stringify(r.tasks)).map(t => normalizeGeofenceFields({
        ...t,
        id: newId(),
        done: false,
        completed: false,
        verified_on_site: false,
        manual_override: false,
        override_reason: null,
        override_distance_meters: null,
        completed_at: null,
        manager_alert: false
    }));
    if (r.depot) {
        depot = { address: '', lat: null, lon: null, useGps: false, ...r.depot };
        depotInput.value = depot.address || '';
        persistDepot();
    }
    returnCheckbox.checked = !!r.returnToDepot;
    localStorage.setItem('pihatyot_return', returnCheckbox.checked ? '1' : '0');
    currentRouteId = r.id;
    persistRoutes();
    saveAndRender();
    renderRoutes();
    const cfgDrawer = document.getElementById('routeConfigDrawer');
    if (cfgDrawer) cfgDrawer.style.display = 'none';
    document.getElementById('btnToggleRouteConfig')?.classList.remove('active');
    showStatus(`Reitti "${esc(r.name)}" ladattu.`, 'success');
    document.getElementById('taskList').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renameRoute(id) {
    const r = routes.find(x => String(x.id) === String(id));
    if (!r) return;
    const name = await askName('Nimeä reitti uudelleen', r.name);
    if (!name) return;
    r.name = name;
    r.updated = new Date().toISOString();
    persistRoutes();
    renderRoutes();
    renderActiveRoute();
}

function deleteRoute(id) {
    const r = routes.find(x => String(x.id) === String(id));
    if (!r || !confirm(`Poistetaanko reitti "${r.name}"? Tätä ei voi perua.`)) return;
    routes = routes.filter(x => x !== r);
    if (String(currentRouteId) === String(id)) currentRouteId = null;
    persistRoutes();
    renderRoutes();
    renderActiveRoute();
}

function newEmptyRoute() {
    if (tasks.length && !confirm('Aloitetaanko uusi tyhjä reitti? Nykyinen lista tyhjennetään (tallennetut reitit säilyvät).')) return;
    tasks = [];
    currentRouteId = null;
    persistRoutes();
    saveAndRender();
    renderRoutes();
}

function renderRoutes() {
    const el = document.getElementById('routeList');
    document.getElementById('routeCount').textContent = routes.length;
    if (routes.length === 0) {
        el.innerHTML = '<p class="empty-state">Ei vielä tallennettuja reittejä. Lisää kohteet ja paina "Tallenna reitti".</p>';
        return;
    }
    el.innerHTML = routes.map(r => {
        const active = String(r.id) === String(currentRouteId);
        return `
        <div class="route-item ${active ? 'active' : ''}">
            <div class="route-info">
                <div class="route-name">${esc(r.name)} ${active ? '<span class="badge">Aktiivinen</span>' : ''}</div>
                <div class="route-meta">${r.tasks.length} kohdetta · päivitetty ${esc(fmtDate(r.updated || r.created))}</div>
            </div>
            <div class="route-actions">
                <button class="tiny-btn" onclick="loadRoute(${r.id})">▶ Lataa</button>
                <button class="tiny-btn" onclick="renameRoute(${r.id})">✎ Nimeä</button>
                <button class="tiny-btn danger" onclick="deleteRoute(${r.id})">✕</button>
            </div>
        </div>`;
    }).join('');
}

function renderActiveRoute() {
    const el = document.getElementById('activeRoute');
    if (!el) return;
    const cur = getCurrentRoute();
    if (!cur) { el.innerHTML = ''; return; }
    const dirty = taskSig(tasks) !== taskSig(cur.tasks);
    el.innerHTML = `Reitti: <b>${esc(cur.name)}</b>` + (dirty ? ' <span class="dirty">● tallentamattomia muutoksia</span>' : '');
}

// Kohteen muokkaus
const editDlg = document.getElementById('editDialog');
const editAddress = document.getElementById('editAddress');
document.getElementById('editType').innerHTML = document.getElementById('type').innerHTML;

function editTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    openPropertyEditForm(id);
}
window.editTask = editTask;

// Sivupalkin kohteen muokkauslomake (#property-edit-form)
function openPropertyEditForm(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    normalizeGeofenceFields(t);
    editingId = id;

    const formEl = document.getElementById('property-edit-form');
    if (!formEl) return;

    // Suljetaan muut avoimet paneelit
    const addTaskDrawer = document.getElementById('addTaskDrawer');
    const routeConfigDrawer = document.getElementById('routeConfigDrawer');
    if (addTaskDrawer) addTaskDrawer.style.display = 'none';
    if (routeConfigDrawer) routeConfigDrawer.style.display = 'none';
    document.getElementById('btnToggleAddTask')?.classList.remove('active');
    document.getElementById('btnToggleRouteConfig')?.classList.remove('active');

    document.getElementById('editPropertyId').value = t.id;
    document.getElementById('editPropertyName').value = t.name || '';
    const addrInput = document.getElementById('editPropertyAddress');
    if (addrInput) {
        addrInput.value = t.address || '';
        ['lat', 'lon', 'geo', 'addr'].forEach(k => delete addrInput.dataset[k]);
    }
    const notesInput = document.getElementById('editPropertyNotes');
    if (notesInput) notesInput.value = t.notes || '';

    const gfEn = document.getElementById('editPropertyGeofenceEnabled');
    const gfRad = document.getElementById('editPropertyGeofenceRadius');
    const gfRadNum = document.getElementById('editPropertyGeofenceRadiusNumber');
    const gfRadVal = document.getElementById('editPropertyGeofenceRadiusVal');
    const rad = t.geofence_radius || 80;
    if (gfEn) gfEn.checked = t.geofence_enabled !== false;
    if (gfRad) gfRad.value = rad;
    if (gfRadNum) gfRadNum.value = rad;
    if (gfRadVal) gfRadVal.textContent = rad;

    formEl.style.display = 'block';
    selectActiveProperty(id, true);
    formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
window.openPropertyEditForm = openPropertyEditForm;

function cancelPropertyEdit() {
    editingId = null;
    const formEl = document.getElementById('property-edit-form');
    if (formEl) formEl.style.display = 'none';
}
window.cancelPropertyEdit = cancelPropertyEdit;

function savePropertyEditForm() {
    const id = editingId || parseInt(document.getElementById('editPropertyId').value, 10);
    if (!id) return;
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    const nameInput = document.getElementById('editPropertyName');
    const addrInput = document.getElementById('editPropertyAddress');
    const notesInput = document.getElementById('editPropertyNotes');
    const gfEn = document.getElementById('editPropertyGeofenceEnabled');
    const gfRad = document.getElementById('editPropertyGeofenceRadius');

    const newName = nameInput ? nameInput.value.trim() : '';
    const newAddress = addrInput ? addrInput.value.trim() : '';
    if (!newName || !newAddress) {
        alert('Täytä vähintään kohteen nimi ja osoite!');
        return;
    }

    const changedAddress = newAddress !== t.address;
    t.name = newName;
    if (notesInput) t.notes = notesInput.value.trim();

    const radVal = gfRad ? Number(gfRad.value) || 80 : 80;
    t.geofence_enabled = gfEn ? gfEn.checked : true;
    t.geofence_radius = radVal;

    // Synkronoidaan asiakasrekisteriin jos sama asiakas löytyy
    const cust = customers.find(c =>
        (t.customerId && String(c.id) === String(t.customerId)) ||
        (c.name && c.name.toLowerCase() === t.name.toLowerCase())
    );
    if (cust) {
        cust.name = t.name;
        cust.notes = t.notes;
        cust.geofence_enabled = t.geofence_enabled;
        cust.geofence_radius = t.geofence_radius;
        if (changedAddress) cust.address = newAddress;
        persistCustomers();
    }

    if (changedAddress) {
        t.address = newAddress;
        t.gps = false;
        if (addrInput && addrInput.dataset.addr === newAddress && addrInput.dataset.lat) {
            t.lat = parseFloat(addrInput.dataset.lat);
            t.lon = parseFloat(addrInput.dataset.lon);
            t.geoName = addrInput.dataset.geo || '';
        } else {
            t.lat = null;
            t.lon = null;
            t.geoName = '';
            geocodeTask(t.id);
        }
    }

    cancelPropertyEdit();
    saveAndRender();
    if (typeof syncYardMapGeofenceControls === 'function') syncYardMapGeofenceControls();
    if (typeof renderYardGeofenceCircle === 'function') renderYardGeofenceCircle();
    showStatus('Tiedot tallennettu!', 'success');
}
window.savePropertyEditForm = savePropertyEditForm;

function activatePropertySatelliteBoundariesEdit() {
    const id = editingId || parseInt(document.getElementById('editPropertyId').value, 10);
    if (!id) return;
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    // Varmistetaan että hallintatila on kytketty päälle
    if (typeof setAppMode === 'function') setAppMode('admin');

    // Valitaan ja keskitetään kartta
    const key = makeTargetGeoKey(t.name, t.address);
    if (typeof selectYardMapTarget === 'function') selectYardMapTarget(key);
    if (typeof centerMapOnTarget === 'function') centerMapOnTarget(key);

    // Jos kartalla on piirrettyjä alueita, valitaan ensimmäinen muokkauskahvoineen
    if (yardDrawnItems) {
        let firstLayer = null;
        yardDrawnItems.eachLayer(l => { if (!firstLayer) firstLayer = l; });
        if (firstLayer && typeof selectMapLayer === 'function') {
            selectMapLayer(firstLayer);
        }
    }

    const card = document.getElementById('yardMapCard');
    if (card) {
        setTimeout(() => {
            if (yardMap) yardMap.invalidateSize();
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    showStatus('Voit nyt muokata pihan satelliittirajoja kartan kahvoista tai piirtää uuden alueen.', 'info');
}
window.activatePropertySatelliteBoundariesEdit = activatePropertySatelliteBoundariesEdit;

editDlg.addEventListener('close', () => {
    const id = editingId;
    editingId = null;
    if (editDlg.returnValue !== 'ok' || id == null) {
        if (typeof renderYardGeofenceCircle === 'function') renderYardGeofenceCircle();
        return;
    }
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const address = editAddress.value.trim();
    const changed = address !== t.address;
    t.name = document.getElementById('editName').value.trim();
    const phoneEl = document.getElementById('editTaskPhone');
    if (phoneEl) t.phone = phoneEl.value.trim();
    const emailEl = document.getElementById('editTaskEmail');
    if (emailEl) t.email = emailEl.value.trim();
    t.type = document.getElementById('editType').value;
    t.notes = document.getElementById('editNotes').value.trim();

    const gfEn = document.getElementById('editTaskGeofenceEnabled');
    const gfType = document.getElementById('editTaskGeofenceType');
    const gfRad = document.getElementById('editTaskGeofenceRadius');
    t.geofence_enabled = gfEn ? gfEn.checked : true;
    t.geofence_type = gfType ? gfType.value : 'radius';
    t.geofence_radius = gfRad ? Number(gfRad.value) || 80 : 80;

    // Synkronoidaan myös asiakasrekisteriin, jos sama kohde löytyy sieltä
    const cust = customers.find(c =>
        (t.customerId && String(c.id) === String(t.customerId)) ||
        (c.name && c.name.toLowerCase() === t.name.toLowerCase())
    );
    if (cust) {
        cust.geofence_enabled = t.geofence_enabled;
        cust.geofence_type = t.geofence_type;
        cust.geofence_radius = t.geofence_radius;
        persistCustomers();
    }

    if (changed) {
        t.address = address;
        t.gps = false;
        if (editAddress.dataset.addr === address && editAddress.dataset.lat) {
            t.lat = parseFloat(editAddress.dataset.lat);
            t.lon = parseFloat(editAddress.dataset.lon);
            t.geoName = editAddress.dataset.geo || '';
        } else {
            t.lat = null; t.lon = null; t.geoName = '';
            saveAndRender();
            geocodeTask(t.id);
            return;
        }
    }
    saveAndRender();
    if (typeof syncYardMapGeofenceControls === 'function') syncYardMapGeofenceControls();
    if (typeof renderYardGeofenceCircle === 'function') renderYardGeofenceCircle();
});

// Osoite-ehdotukset, varmuuskopiointi, geokoodaus ja reitin optimointi
// ---------- Osoite-ehdotukset (Photon / OpenStreetMap) ----------
function formatSuggestion(f, query) {
    const p = f.properties || {};
    const street = p.street || (p.type === 'street' ? p.name : '');
    let num = p.housenumber || '';
    // Jos OpenStreetMapistä puuttuu talonumero, mutta käyttäjä on kirjoittanut sen hakukenttään:
    if (!num && query) {
        const m = query.match(/\b(\d+[a-zA-Z]?)\b/);
        if (m && street) num = m[1];
    }
    const main = num ? `${street} ${num}`.trim() : (street || p.name || '');
    const city = p.city || p.town || p.village || p.locality || p.district || p.county || '';
    const extra = (p.type === 'house' && p.name && p.name !== street) ? p.name : '';
    return {
        address: [main, city].filter(Boolean).join(', '),
        sub: [extra, p.postcode, city].filter(Boolean).join(', '),
        main,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
    };
}

function suggestionBias() {
    let c = (depot.lat && depot.lon) ? depot : tasks.find(t => t.lat && t.lon);
    return c ? `&lat=${c.lat}&lon=${c.lon}` : '';
}

function attachAutocomplete(input, onPick) {
    const wrap = document.createElement('div');
    wrap.className = 'ac-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const list = document.createElement('ul');
    list.className = 'suggest';
    list.hidden = true;
    wrap.appendChild(list);
    input.setAttribute('autocomplete', 'off');

    let timer = null, ctrl = null, items = [], active = -1;

    const hide = () => { list.hidden = true; active = -1; };
    const highlight = () => [...list.children].forEach((li, i) => li.classList.toggle('active', i === active));

    function pick(item) {
        input.value = item.address;
        input.dataset.lat = item.lat;
        input.dataset.lon = item.lon;
        input.dataset.geo = item.address;
        input.dataset.addr = item.address;
        hide();
        if (onPick) onPick(item);
    }

    function show() {
        if (!items.length) { hide(); return; }
        list.style.top = (input.offsetTop + input.offsetHeight + 4) + 'px';
        list.innerHTML = items.map((it, i) =>
            `<li data-i="${i}"><span class="s-main">📍 ${esc(it.main || it.address)}</span><span class="s-sub">${esc(it.sub)}</span></li>`).join('');
        list.hidden = false;
        active = -1;
    }

    async function search(q) {
        if (ctrl) ctrl.abort();
        ctrl = new AbortController();
        try {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&bbox=19.0,59.5,31.6,70.1${suggestionBias()}`;
            const res = await fetch(url, { signal: ctrl.signal });
            if (!res.ok) return;
            const data = await res.json();
            const seen = new Set();
            let feats = (data.features || []).filter(f => !f.properties || !f.properties.countrycode || f.properties.countrycode === 'FI');

            // Jos tarkalla haulla ei löytynyt osumia, kokeillaan ilman postinumeroa
            if (feats.length === 0 && /\b\d{5}\b/.test(q)) {
                const simplified = q.replace(/\b\d{5}\b/, '').replace(/,\s*,/g, ',').trim();
                const fbUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(simplified)}&limit=10&bbox=19.0,59.5,31.6,70.1${suggestionBias()}`;
                const fbRes = await fetch(fbUrl, { signal: ctrl.signal });
                if (fbRes.ok) {
                    const fbData = await fbRes.json();
                    feats = (fbData.features || []).filter(f => !f.properties || !f.properties.countrycode || f.properties.countrycode === 'FI');
                }
            }

            items = feats
                .map(f => formatSuggestion(f, q))
                .filter(it => it.address && !seen.has(it.address + it.sub) && seen.add(it.address + it.sub))
                .slice(0, 6);
            if (document.activeElement === input) show();
        } catch (e) {
            if (e.name !== 'AbortError') console.error('Ehdotushaku epäonnistui:', e);
        }
    }

    input.addEventListener('input', () => {
        ['lat', 'lon', 'geo', 'addr'].forEach(k => delete input.dataset[k]);
        clearTimeout(timer);
        const q = input.value.trim();
        if (q.length < 3) { hide(); return; }
        timer = setTimeout(() => search(q), 350);
    });
    input.addEventListener('keydown', e => {
        if (list.hidden) return;
        if (e.key === 'ArrowDown') { active = Math.min(active + 1, items.length - 1); highlight(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); highlight(); e.preventDefault(); }
        else if (e.key === 'Enter' && active >= 0) { pick(items[active]); e.preventDefault(); }
        else if (e.key === 'Escape') { hide(); }
    });
    input.addEventListener('blur', () => setTimeout(hide, 150));
    // pointerdown, jotta valinta toimii ennen kuin kenttä menettää fokuksen
    list.addEventListener('pointerdown', e => {
        const li = e.target.closest('li');
        if (!li) return;
        e.preventDefault();
        pick(items[parseInt(li.dataset.i, 10)]);
    });
}

// ---------- Varmuuskopio ----------
function exportBackup() {
    const data = { version: 8, exported: new Date().toISOString(), tasks, depot, routes, currentRouteId,
                   returnToDepot: returnCheckbox.checked, customers, workLogs, defaultPricing };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `auraus-varmuuskopio-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showStatus('Varmuuskopio ladattu.', 'success');
}

function importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data.tasks)) throw new Error('Tiedostosta ei löytynyt kohteita.');
            const rc = Array.isArray(data.routes) ? data.routes.length : 0;
            const cc = Array.isArray(data.customers) ? data.customers.length : 0;
            const lc = Array.isArray(data.workLogs) ? data.workLogs.length : 0;
            if (!confirm(`Korvataanko nykyiset tiedot varmuuskopiolla (${data.tasks.length} kohdetta, ${rc} tallennettua reittiä, ${cc} asiakasta, ${lc} lokimerkintää)?`)) return;
            tasks = data.tasks;
            if (Array.isArray(data.customers)) {
                customers = data.customers;
                persistCustomers();
                renderCustomers();
            }
            if (Array.isArray(data.workLogs)) {
                workLogs = data.workLogs;
                persistWorkLogs();
            }
            if (data.defaultPricing) {
                defaultPricing = { ...defaultPricing, ...data.defaultPricing };
                persistDefaultPricing();
            }
            if (Array.isArray(data.routes)) {
                routes = data.routes;
                currentRouteId = data.currentRouteId || null;
                persistRoutes();
                renderRoutes();
            }
            if (data.depot) {
                depot = { address: '', lat: null, lon: null, useGps: false, ...data.depot };
                depotInput.value = depot.address || '';
                persistDepot();
            }
            returnCheckbox.checked = !!data.returnToDepot;
            localStorage.setItem('pihatyot_return', returnCheckbox.checked ? '1' : '0');
            saveAndRender();
            showStatus('Varmuuskopio palautettu.', 'success');
        } catch (e) {
            showStatus('Tuonti epäonnistui: ' + esc(e.message), 'info');
        }
        input.value = '';
    };
    reader.readAsText(file);
}

// ---------- Geokoodaus ----------
// Nominatim sallii max 1 haun sekunnissa
const GEOCODE_DELAY_MS = 1100;
let lastGeocodeAt = 0;

let geocodeQueue = Promise.resolve();
function fetchCoordinates(addressStr) {
    const run = geocodeQueue.then(() => fetchCoordinatesNow(addressStr));
    geocodeQueue = run.catch(() => {});
    return run;
}

async function fetchCoordinatesNow(addressStr) {
    if (!addressStr || !addressStr.trim()) return null;
    const clean = addressStr.trim();

    const wait = lastGeocodeAt + GEOCODE_DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastGeocodeAt = Date.now();

    // 1. Kokeillaan ensin Nominatimia tarkalla osoitteella
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 7000);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fi&accept-language=fi&q=${encodeURIComponent(clean)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name || '' };
            }
        }
    } catch (e) {
        console.warn('Nominatim-haku epäonnistui:', e);
    }

    // 2. Kokeillaan Photon-palvelua koko osoitteella (Photonissa on parempi sumea haku)
    try {
        const pUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=1&bbox=19.0,59.5,31.6,70.1${suggestionBias()}`;
        const pRes = await fetch(pUrl);
        if (pRes.ok) {
            const pData = await pRes.json();
            if (pData && pData.features && pData.features.length > 0) {
                const f = pData.features[0];
                const props = f.properties || {};
                const disp = [props.street || props.name, props.housenumber, props.city || props.town].filter(Boolean).join(' ');
                return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: disp || clean };
            }
        }
    } catch (e) {
        console.warn('Photon-haku epäonnistui:', e);
    }

    // 3. Fallback: Jos talonumeroa (kuten Sudenkatu 20 Tampere) tai postinumeroa ei ole vielä kartoitettu OpenStreetMapiin,
    // haetaan katu ja kaupunki, jotta mönkijä saa reitin ja sijainnin oikealle kadulle!
    try {
        const parts = clean.split(',').map(s => s.trim());
        const streetWithoutNum = parts[0].replace(/\b\d+.*$/, '').trim();
        const cityPart = parts.length > 1 ? parts[parts.length - 1].replace(/\b\d{5}\b/, '').trim() : '';
        const streetQuery = [streetWithoutNum, cityPart].filter(Boolean).join(', ');

        if (streetQuery && streetQuery !== clean) {
            const fUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(streetQuery)}&limit=1&bbox=19.0,59.5,31.6,70.1${suggestionBias()}`;
            const fRes = await fetch(fUrl);
            if (fRes.ok) {
                const fData = await fRes.json();
                if (fData && fData.features && fData.features.length > 0) {
                    const f = fData.features[0];
                    const props = f.properties || {};
                    const disp = `${props.name || streetWithoutNum}, ${props.city || cityPart} (kadun perusteella)`;
                    return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: disp };
                }
            }
        }
    } catch (e) {
        console.warn('Varahaku kadulla epäonnistui:', e);
    }

    return null;
}

async function geocodeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || (task.lat && task.lon)) return;
    const c = await fetchCoordinates(task.address);
    if (c) {
        task.lat = c.lat; task.lon = c.lon; task.geoName = c.name; task.gps = false;
        saveAndRender();
    }
}

// Hakee puuttuvat koordinaatit; palauttaa epäonnistuneet kohteet
async function ensureCoords(list, label) {
    const failed = [];
    const need = list.filter(t => !t.lat || !t.lon);
    for (let i = 0; i < need.length; i++) {
        const t = need[i];
        showStatus(`${label} (${i + 1}/${need.length}): ${esc(t.name)}...`, 'loading');
        const c = await fetchCoordinates(t.address);
        if (c) { t.lat = c.lat; t.lon = c.lon; t.geoName = c.name; t.gps = false; }
        else failed.push(t);
    }
    return failed;
}

function setTaskGPS(taskId) {
    if (!navigator.geolocation) { alert('Laitteesi ei tue GPS-paikannusta.'); return; }
    showStatus('Haetaan sijaintia...', 'loading');
    navigator.geolocation.getCurrentPosition(
        pos => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.lat = pos.coords.latitude;
                task.lon = pos.coords.longitude;
                task.gps = true;
                task.geoName = 'Oma GPS-sijainti';
                saveAndRender();
                showStatus(`Kohteen "${esc(task.name)}" sijainti tallennettu!`, 'success');
            }
        },
        err => showStatus('GPS-virhe: ' + esc(err.message) + '. Huom: GPS vaatii yleensä https-yhteyden.', 'info'),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function clearTaskCoords(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    task.lat = null; task.lon = null; task.gps = false; task.geoName = '';
    saveAndRender();
    geocodeTask(taskId);
}

// ---------- Optimointi ----------
// Lähin naapuri + 2-opt. closed=true: reitti palaa varikolle; false: avoin reitti.
function optimizeOrder(start, items, closed) {
    const unvisited = [...items];
    const route = [start];
    let cur = start;
    while (unvisited.length) {
        let bi = 0, bd = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
            const d = dist(cur, unvisited[i]);
            if (d < bd) { bd = d; bi = i; }
        }
        cur = unvisited.splice(bi, 1)[0];
        route.push(cur);
    }
    if (closed) route.push(start);

    const n = route.length;
    let improved = true, guard = 0;
    while (improved && guard++ < 100) {
        improved = false;
        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 2; j < n; j++) {
                const a = route[i], b = route[i + 1], c = route[j], d = route[j + 1];
                if (closed && j === n - 1) continue; // viimeinen solmu on varikko
                const delta = dist(a, c) + (d ? dist(b, d) : 0) - dist(a, b) - (d ? dist(c, d) : 0);
                if (delta < -0.001) {
                    let l = i + 1, r = j;
                    while (l < r) { [route[l], route[r]] = [route[r], route[l]]; l++; r--; }
                    improved = true;
                }
            }
        }
    }
    return route.filter(x => !x.isStart);
}

async function autoOptimizeRoute() {
    const pending = tasks.filter(t => !t.done);
    if (pending.length < 2) {
        showStatus('Optimointiin tarvitaan vähintään 2 tekemätöntä kohdetta.', 'info');
        return;
    }
    saveDepot();
    const btn = document.getElementById('btnOptimize');
    btn.disabled = true;
    document.getElementById('routeLinks').innerHTML = '';

    try {
        // Varikon koordinaatit
        if (depot.address && !depot.useGps && (!depot.lat || !depot.lon)) {
            showStatus('Haetaan varikon sijaintia...', 'loading');
            const c = await fetchCoordinates(depot.address);
            if (c) { depot.lat = c.lat; depot.lon = c.lon; persistDepot(); }
        }
        const depotOk = !!(depot.lat && depot.lon);

        const failed = await ensureCoords(pending, 'Haetaan koordinaatteja');
        saveAndRender();

        const valid = pending.filter(t => t.lat && t.lon);
        const missing = pending.filter(t => !t.lat || !t.lon);
        if (valid.length < 2) {
            showStatus('Riittäviä koordinaatteja ei löytynyt. Tarkista osoitteet (katu + kaupunki) tai aseta GPS kohteille.', 'info');
            return;
        }

        const closed = returnCheckbox.checked && depotOk;
        let start, items;
        if (depotOk) {
            start = { lat: depot.lat, lon: depot.lon, isStart: true };
            items = valid;
        } else {
            // Ei varikkoa: ensimmäinen kohde pysyy lähtöpisteenä
            start = valid[0];
            items = valid.slice(1);
        }

        let ordered = optimizeOrder(start, items, closed);
        if (!depotOk) ordered = [start, ...ordered.filter(x => x !== start)];

        tasks = [...ordered, ...missing, ...tasks.filter(t => t.done)];
        saveAndRender();

        let msg = `✨ ${ordered.length} kohdetta järjestetty lyhimpään ajojärjestykseen.`;
        if (failed.length) {
            msg += `<br>⚠️ Osoitetta ei löytynyt: ${failed.map(t => '<b>' + esc(t.name) + '</b> (' + esc(t.address) + ')').join(', ')}. Ne jätettiin listan loppuun. Lisää osoitteeseen kaupunki tai aseta GPS paikan päällä.`;
        }
        if (!depotOk) msg += '<br>ℹ️ Varikkoa ei ole asetettu, joten ensimmäinen kohde on lähtöpiste.';
        showStatus(msg, failed.length ? 'info' : 'success');
    } finally {
        btn.disabled = false;
    }
}

function sortByNearestToMe() {
    if (!navigator.geolocation) { alert('Laitteesi ei tue GPS-paikannusta.'); return; }
    showStatus('Haetaan nykyistä sijaintiasi...', 'loading');
    navigator.geolocation.getCurrentPosition(
        async pos => {
            const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            const pending = tasks.filter(t => !t.done);
            const failed = await ensureCoords(pending, 'Haetaan koordinaatteja');
            const withC = pending.filter(t => t.lat && t.lon);
            const without = pending.filter(t => !t.lat || !t.lon);

            // Etene aina lähimpään seuraavaan kohteeseen oman sijainnin jälkeen
            const ordered = optimizeOrder({ ...me, isStart: true }, withC, false);
            tasks = [...ordered, ...without, ...tasks.filter(t => t.done)];
            saveAndRender();
            showStatus('Kohteet järjestetty oman sijaintisi mukaan.' +
                (failed.length ? ` ⚠️ ${failed.length} osoitetta ei löytynyt.` : ''), failed.length ? 'info' : 'success');
        },
        err => showStatus('GPS-virhe: ' + esc(err.message) + '. Huom: GPS vaatii yleensä https-yhteyden.', 'info'),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ---------- Google Maps ----------
// Maps-linkki sallii max 10 pysähdystä: jaetaan tarvittaessa osiin.
function openRouteInGoogleMaps() {
    const pending = tasks.filter(t => !t.done);
    if (pending.length === 0) { alert('Ei tekemättömiä kohteita reititettäväksi!'); return; }
    saveDepot();

    const points = [];
    const useDepot = hasDepot();
    if (useDepot) points.push(depotRef());
    pending.forEach(t => points.push(taskRef(t)));
    if (useDepot && returnCheckbox.checked) points.push(depotRef());

    const box = document.getElementById('routeLinks');
    box.innerHTML = '';

    if (points.length === 1) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(points[0])}`, '_blank');
        return;
    }

    const urls = [];
    let s = 0;
    while (s < points.length - 1) {
        const e = Math.min(s + 10, points.length - 1);
        const wp = points.slice(s + 1, e).map(encodeURIComponent);
        let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(points[s])}&destination=${encodeURIComponent(points[e])}&travelmode=driving`;
        if (wp.length) url += `&waypoints=${wp.join('|')}`;
        urls.push(url);
        s = e;
    }

    if (urls.length === 1) {
        window.open(urls[0], '_blank');
        return;
    }
    box.innerHTML = `<div class="status-box status-info" style="display:block;">Reitti on pitkä, joten se on jaettu ${urls.length} osaan. Avaa osat järjestyksessä:<br>` +
        urls.map((u, i) => `<a href="${u}" target="_blank" rel="noopener" style="display:inline-block;margin:6px 8px 0 0;font-weight:700;">▶ Osa ${i + 1}/${urls.length}</a>`).join('') +
        `</div>`;
}

// ---------- Näkymä ----------
function updateDistanceSummary(pending) {
    const el = document.getElementById('summaryDistance');
    const pts = [];
    if (depot.lat && depot.lon && hasDepot()) pts.push(depot);
    pending.forEach(t => { if (t.lat && t.lon) pts.push(t); });
    if (depot.lat && depot.lon && hasDepot() && returnCheckbox.checked && pts.length > 1) pts.push(depot);
    if (pts.length < 2) { el.textContent = ''; return; }
    let km = 0;
    for (let i = 1; i < pts.length; i++) km += dist(pts[i - 1], pts[i]);
    el.textContent = `≈ ${km.toFixed(1)} km linnuntietä`;
}

// Osoitteessa on talonumero, mutta kartalta löytyi vain katu
function approxLocation(t) {
    if (t.gps || !t.lat || !t.geoName) return false;
    const hasNumber = /\d/.test((t.address || '').split(',')[0]);
    const foundNumber = /\d/.test(t.geoName.split(',').slice(0, 2).join(','));
    return hasNumber && !foundNumber;
}

// Sovelluksen käynnistys ja tapahtumankuuntelijoiden alustus
function initYardFlowApp() {
    const searchInput = document.getElementById('property-search-input');
    if (searchInput && !searchInput.dataset.listenerAttached) {
        searchInput.addEventListener('input', e => handlePropertySearch(e.target.value));
        searchInput.dataset.listenerAttached = '1';
    }

    // Teeman alustus
    updateThemeUI(document.documentElement.getAttribute('data-theme') || 'dark');

    // Käyttötilan ja kotinäkymän widgettien alustus
    const savedAppMode = localStorage.getItem('yardflow_app_mode') || 'field';
    setAppMode(savedAppMode);
    applyHomeWidgetVisibility();

    renderTasks();
    renderRoutes();
    renderCustomers();
    renderWorkLogs();
    updateCustomerBadges();
    updateWorkLogBadges();
    updatePhotoCounts();
    initYardSatelliteMap();

    // Osoite-ehdotukset: lisäyslomake, muokkausdialogi, asiakaslomakkeet, työloki ja varikko
    attachAutocomplete(document.getElementById('address'));
    attachAutocomplete(document.getElementById('editAddress'));
    attachAutocomplete(document.getElementById('editPropertyAddress'));
    attachAutocomplete(document.getElementById('custAddress'));
    attachAutocomplete(document.getElementById('editCustAddress'));
    attachAutocomplete(document.getElementById('manualLogAddress'));
    attachAutocomplete(depotInput, pick => {
        depot.address = pick.address;
        depot.lat = pick.lat;
        depot.lon = pick.lon;
        depot.useGps = false;
        persistDepot();
    });

    // Offline-tuki ja asennettavuus (vaatii https tai localhost)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYardFlowApp);
} else {
    initYardFlowApp();
}
