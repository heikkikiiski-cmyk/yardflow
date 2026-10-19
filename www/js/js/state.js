// ============================================================
// YardFlow - Globaali sovellustila, datataulukot ja apufunktiot (js/state.js)
// ============================================================

// ---------- Apufunktiot ----------
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

let lastId = 0;
function newId() {
    let id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    if (id <= lastId) id = lastId + 1;
    lastId = id;
    return id;
}

function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ' klo ' +
           d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
}

// Käyttötila ('field' = Kenttätila, 'admin' = Hallintatila)
let currentAppMode = 'field'; // Oletuksena kenttätila turvalliseen ajoon

// Kotinäkymän widget-asetukset
const DEFAULT_HOME_WIDGETS = {
    progress: true,
    nextYard: true,
    tickets: true,
    search: true
};

function getHomeWidgetConfig() {
    try {
        const raw = localStorage.getItem('yardflow_home_widgets');
        if (raw) return Object.assign({}, DEFAULT_HOME_WIDGETS, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULT_HOME_WIDGETS);
}

function saveHomeWidgetConfig(cfg) {
    try {
        localStorage.setItem('yardflow_home_widgets', JSON.stringify(cfg));
    } catch (e) {}
}

// Hinnoittelu ja laskutuksen tila
// ---------- Hinnoittelu & Laskutus ----------
let defaultPricing = JSON.parse(localStorage.getItem('pihatyot_default_pricing_v2'));
if (!defaultPricing) {
    defaultPricing = {
        monthlyPrice: 0,
        plowPrice: 0,
        sandPrice: 0,
        gravelPrice: 0,
        hourlyRate: 0,
        vatRate: 25.5
    };
    localStorage.setItem('pihatyot_default_pricing_v2', JSON.stringify(defaultPricing));
}

function persistDefaultPricing() {
    localStorage.setItem('pihatyot_default_pricing_v2', JSON.stringify(defaultPricing));
    const vatLbl = document.getElementById('billingVatRateLabel');
    if (vatLbl) vatLbl.textContent = defaultPricing.vatRate;
    const vatPct = document.getElementById('billingVatPercent');
    if (vatPct) vatPct.textContent = defaultPricing.vatRate;
}

let currentInvoiceLines = [];
let currentInvoiceCustomer = null;
let currentInvoiceVisits = [];
let currentPdfFilename = 'YardFlow_Raportti.pdf';

// Valokuvien ja IndexedDB-tietokannan tila
let dbInstance = null;
let photoCounts = {};
let pendingPhotoContext = null;
let currentPhotoBase64 = null;
let currentPhotoCapturedAt = null;
let currentPhotoTimeSource = '';
let activeGalleryCustomerId = null;
let activeGalleryCustomerName = '';
let activeGalleryAddress = '';
let currentLightboxPhoto = null;

// Työloki
// ---------- Työloki & Raportit ----------
let workLogs = JSON.parse(localStorage.getItem('pihatyot_work_logs_v1')) || [];

function persistWorkLogs() {
    localStorage.setItem('pihatyot_work_logs_v1', JSON.stringify(workLogs));
    updateWorkLogBadges();
}

// Kohteet (tasks) ja asiakasrekisteri (customers)
// ---------- Tietojen lataus ----------
let tasks = JSON.parse(localStorage.getItem('pihatyot_tasks_v4')) ||
            JSON.parse(localStorage.getItem('pihatyot_tasks_v3')) ||
            JSON.parse(localStorage.getItem('pihatyot_tasks')) || [];

tasks.forEach(t => normalizeGeofenceFields(t));

// ---------- Asiakasrekisteri ----------
let customers = JSON.parse(localStorage.getItem('pihatyot_customers_v1')) || [];
// Siemennetään aiemmin syötetyistä kohteista, jos asiakasrekisteri on vielä tyhjä
if (customers.length === 0 && tasks.length > 0) {
    const seen = new Set();
    tasks.forEach(t => {
        const key = (t.name || '').toLowerCase() + '|' + (t.address || '').toLowerCase();
        if (!seen.has(key) && (t.name || t.address)) {
            seen.add(key);
            customers.push(normalizeGeofenceFields({
                id: newId(),
                name: t.name || '',
                address: t.address || '',
                phone: t.phone || '',
                email: t.email || '',
                paymentMethod: t.paymentMethod || 'Laskutus',
                contractType: t.contractType || 'Kuukausi + käynnit',
                defaultType: t.type || 'Auraus & Hiekoitus',
                notes: t.notes || '',
                geofence_enabled: t.geofence_enabled !== undefined ? !!t.geofence_enabled : true,
                geofence_type: t.geofence_type || 'radius',
                geofence_radius: Number(t.geofence_radius) || 80,
                created: new Date().toISOString()
            }));
        }
    });
    if (customers.length > 0) {
        localStorage.setItem('pihatyot_customers_v1', JSON.stringify(customers));
    }
}
customers.forEach(c => normalizeGeofenceFields(c));

function persistCustomers() {
    localStorage.setItem('pihatyot_customers_v1', JSON.stringify(customers));
    updateCustomerBadges();
}
let editingCustomerId = null;

// Varikko (depot) ja suodattimen tila
let depot = JSON.parse(localStorage.getItem('pihatyot_depot_v4')) || {
    address: localStorage.getItem('pihatyot_depot') || '',
    lat: null, lon: null, useGps: false
};

let currentFilter = 'all';
function persistDepot() {
    localStorage.setItem('pihatyot_depot_v4', JSON.stringify(depot));
    localStorage.setItem('pihatyot_depot', depot.address || '');
    updateDepotBadge();
}
let statusTimer = null;

// Tallennetut reitit
// ---------- Tallennetut reitit ----------
let routes = JSON.parse(localStorage.getItem('pihatyot_routes_v1')) || [];
let currentRouteId = localStorage.getItem('pihatyot_current_route') || null;

function persistRoutes() {
    localStorage.setItem('pihatyot_routes_v1', JSON.stringify(routes));
    if (currentRouteId) localStorage.setItem('pihatyot_current_route', String(currentRouteId));
    else localStorage.removeItem('pihatyot_current_route');
}

const getCurrentRoute = () => routes.find(r => String(r.id) === String(currentRouteId));
const fmtDate = iso => new Date(iso).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' });
const taskSig = list => list.map(t => [t.name, t.address, t.type, t.notes].join('|')).join('~');
let editingId = null;

// Kohdehaun ja aktiivisen kohteen tila
let propertySearchQuery = '';
let activeSelectedTaskId = null;

// Kartan ja piirtoalueiden globaali tila
const YARD_GEOJSON_STORAGE_KEY = 'yardflow_target_geojson_v1';
const YARD_ACTIVE_TARGET_KEY = 'yardflow_active_map_target_v1';

let yardGeoStore = {};
try {
    yardGeoStore = JSON.parse(localStorage.getItem(YARD_GEOJSON_STORAGE_KEY)) || {};
} catch (e) {
    yardGeoStore = {};
}

const YARD_CATEGORIES = {
    machine: {
        key: 'machine',
        label: '🚜 Konealue',
        boxText: '🚜 Konealue',
        color: '#0ea5e9',
        fillColor: '#0ea5e9',
        fillOpacity: 0.35,
        weight: 3
    },
    manual: {
        key: 'manual',
        label: '🧹 Käsityöalue',
        boxText: '🧹 Käsityöalue',
        color: '#ef4444',
        fillColor: '#f59e0b',
        fillOpacity: 0.45,
        weight: 3
    },
    snowdump: {
        key: 'snowdump',
        label: '❄️ Lumenkaatoalue',
        boxText: '❄️ Lumenkaatoalue',
        color: '#38bdf8',
        fillColor: '#06b6d4',
        fillOpacity: 0.45,
        weight: 3
    }
};

let yardMap = null;
let yardDrawnItems = null;
let yardNeighborItems = null;
let yardGeofenceCircle = null;
let yardPinDropMarker = null;
let isPinDropModeActive = false;
let pinDropTargetContext = null; // 'addTask' | 'editTask' | 'moveCardPin'
let activePinMovingTaskId = null;
let currentDrawCategory = 'machine';
let selectedMapLayer = null;
let currentMapTargetKey = localStorage.getItem(YARD_ACTIVE_TARGET_KEY) || '';

function makeTargetGeoKey(name, address) {
    const n = String(name || '').trim().toLowerCase();
    const a = String(address || '').trim().toLowerCase();
    if (!n && !a) return 'default_yard';
    return `${n}|${a}`;
}
