// Palvelutyöläinen: YardFlow toimii offline-tilassa (esim. huonon kentän peitossa).
// Kasvata versiota aina kun muutat tiedostoja, niin päivitys tulee käyttöön.
const CACHE = 'yardflow-v1-10';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    // Vain oman sovelluksen tiedostot; Nominatim ym. menevät suoraan verkkoon
    if (url.origin !== self.location.origin) return;

    // Verkko ensin (saa uusimman version), välimuisti jos ei yhteyttä
    e.respondWith(
        fetch(req)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
                return res;
            })
            .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
});
