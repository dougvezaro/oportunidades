/* Service worker — guarda o app para abrir rápido e sem internet.
   Ao alterar index.html ou outros arquivos do app, aumente a VERSAO. */
const VERSAO = "v2";
const CACHE_APP = "vt-app-" + VERSAO;
const CACHE_EXTERNO = "vt-externo-v1";
const ARQUIVOS_APP = [
  "./", "index.html", "manifest.webmanifest", "xlsx.mini.min.js",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "logo-visual.png", "hero.jpg", "exclusiva.jpg", "icones.css", "fa-solid-900.woff2",
  "jost-latin-400-normal.woff2", "jost-latin-500-normal.woff2", "jost-latin-600-normal.woff2", "jost-latin-700-normal.woff2",
  "cormorant-garamond-latin-600-italic.woff2", "cinzel-latin-500-normal.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_APP).then((c) => c.addAll(ARQUIVOS_APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_APP && k !== CACHE_EXTERNO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // A planilha de dados é tratada pelo próprio app (cache em IndexedDB): não interceptar
  if (url.pathname.endsWith(".xlsx")) return;

  // Fontes e ícones de CDN: usa o que já foi baixado; se não houver, busca e guarda
  if (url.origin !== location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.hostname)) {
      e.respondWith(
        caches.open(CACHE_EXTERNO).then((c) =>
          c.match(req).then((hit) => hit || fetch(req).then((resp) => { c.put(req, resp.clone()); return resp; }))
        )
      );
    }
    return;
  }

  // Arquivos do app: responde com a versão guardada e atualiza em segundo plano
  e.respondWith(
    caches.open(CACHE_APP).then((c) =>
      c.match(req, { ignoreSearch: true }).then((hit) => {
        const rede = fetch(req).then((resp) => {
          if (resp.ok) c.put(req, resp.clone());
          return resp;
        }).catch(() => hit || (req.mode === "navigate" ? c.match("index.html") : undefined));
        return hit || rede;
      })
    )
  );
});
