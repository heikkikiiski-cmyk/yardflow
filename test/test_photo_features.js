/**
 * Test: YardFlow Photo Capture, Categorization, Storage & Reports Integration
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
    console.log('--- Aloitetaan YardFlow valokuvatoimintojen testaus ---');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const wwwIndexPath = path.join(__dirname, '..', 'www', 'index.html');

    assert(fs.existsSync(indexPath), 'index.html tulee olla olemassa');
    assert(fs.existsSync(wwwIndexPath), 'www/index.html tulee olla olemassa');

    const html = fs.readFileSync(indexPath, 'utf-8');
    const wwwHtml = fs.readFileSync(wwwIndexPath, 'utf-8');

    // 1. Kuljettajan HUD ja Dashboard kuvanottopainikkeet
    console.log('1. Tarkistetaan kuljettajan HUD ja dashboardin kuvanottopainikkeet...');
    assert(html.includes('openPhotoCaptureForActiveTarget()'), 'driver-hud-top / bottom tulee kutsua openPhotoCaptureForActiveTarget()');
    assert(html.includes('Ota kuva / Ilmoita huomio'), 'Painikkeen teksti "Ota kuva / Ilmoita huomio" tulee löytyä HUD-kortista');
    assert(html.includes('id="btn-driver-photo"'), 'driver-hud-bottomissa tulee olla id="btn-driver-photo"');
    assert(html.includes('openPhotoCaptureForTask(${nextTask.id})'), 'Dashboardin seuraavan kohteen kortissa tulee voida ottaa kuva');

    // 2. Kuvanotto- ja valintadialogi (#photoCaptureDialog)
    console.log('2. Tarkistetaan kuvanottolomake ja kategoriat...');
    assert(html.includes('id="photoCaptureDialog"'), '#photoCaptureDialog tulee löytyä');
    assert(html.includes('capture="environment"'), 'Kuvanottokentässä tulee olla capture="environment" kameravalintaa varten');
    assert(html.includes('value="Työtodiste"'), 'Kategoria "Työtodiste" tulee löytyä');
    assert(html.includes('value="Este / Epäkohta"'), 'Kategoria "Este / Epäkohta" tulee löytyä');
    assert(html.includes('value="Vahinko / Kolhu"'), 'Kategoria "Vahinko / Kolhu" tulee löytyä');
    assert(html.includes('value="Kiinteistöohje"'), 'Kategoria "Kiinteistöohje" tulee löytyä');
    assert(html.includes('id="btnSavePhoto"'), 'Tallenna kuva -painike tulee löytyä');
    assert(html.includes('id="photoNotesInput"'), 'Vapaa kommenttikenttä tulee löytyä');

    // 3. Kuvan pakkaus ja Supabase Storage / Offline-synkronointi
    console.log('3. Tarkistetaan kuvan pakkaus, Supabase Storage ja offline-synkronointi...');
    assert(html.includes('compressImage(file, 1280, 0.70)'), 'Kuvan pakkauslaadun tulee olla 0.70 ja max dimension 1280');
    assert(html.includes('yardflow_photos'), 'Storage-bucketin nimen tulee olla yardflow_photos');
    assert(html.includes('work_photos'), 'Tietokantataulun nimen tulee olla work_photos');
    assert(html.includes('yardflow_photo_sync_queue'), 'Offline-synkronointijonon avain tulee löytyä');
    assert(html.includes('function uploadPhotoToSupabase'), 'uploadPhotoToSupabase-funktion tulee olla määritelty');
    assert(html.includes('function syncPendingPhotos'), 'syncPendingPhotos-funktion tulee olla määritelty');

    // 4. Adminin asiakaskortin ohjekuvat ja galleria
    console.log('4. Tarkistetaan adminin asiakaskortin ohjekuvat ja galleria...');
    assert(html.includes('customer-photos-section'), 'Asiakaskortissa tulee olla Kuvat ja kiinteistöohjeet -osio');
    assert(html.includes('Lisää ohjekuva kohteelle'), 'Asiakaskortissa tulee olla Lisää ohjekuva kohteelle -painike');
    assert(html.includes('openAddPhotoForSpecificCustomer'), 'openAddPhotoForSpecificCustomer-funktion tulee löytyä');
    assert(html.includes('filterGalleryCategory'), 'Gallerian kategoriafiltterin tulee löytyä');

    // 5. Työlokien kameramerkintä ja Lightbox-metatiedot
    console.log('5. Tarkistetaan työlokin kameramerkinnät ja Lightbox...');
    assert(html.includes('photo-indicator-btn'), 'Työhistorian taulukossa tulee olla photo-indicator-btn');
    assert(html.includes('openPhotosForWorkLog'), 'openPhotosForWorkLog-funktion tulee löytyä');
    assert(html.includes('id="lightboxCoords"'), 'Lightboxissa tulee olla koordinaattikenttä');
    assert(html.includes('id="lightboxDriver"'), 'Lightboxissa tulee olla kuljettajan kenttä');
    assert(html.includes('id="lightboxNotes"'), 'Lightboxissa tulee olla selitekenttä');

    // 6. Työraportin PDF-vienti ja valokuvat
    console.log('6. Tarkistetaan työraportin PDF-valintaruutu ja liite...');
    assert(html.includes('id="includePhotosInPdf"'), 'Suodatinpalkissa tulee olla includePhotosInPdf-valintaruutu');
    assert(html.includes('Ota mukaan valokuvat (työnäytteet ja vahinkoilmoitukset)'), 'Valintaruudun tekstin tulee löytyä');
    assert(html.includes('Liite: Työnäytteet, esteet ja vahinkoilmoitukset'), 'PDF-raportin liitteessä tulee olla otsikko valokuville');

    // 7. Pääkansion ja www-kansion synkronointi
    console.log('7. Tarkistetaan tiedostojen synkronointi pääkansion ja www/-kansion välillä...');
    assert.strictEqual(html, wwwHtml, 'index.html ja www/index.html tulee olla identtiset');

    console.log('✅ KAIKKI TESTIT HYVÄKSYTTY ONNISTUNEESTI! (7/7)');
}

runTests();
