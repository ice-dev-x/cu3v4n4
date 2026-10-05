const BASE_URL = "https://cuevana3k.pro";
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------- COMPATIBILIDAD HÍBRIDA (Terminal + Kino SDK v6) ----------
const isKino = typeof kino !== "undefined";

const safeFetch = async (url, options = {}) => {
  if (isKino && kino.fetch) {
    return await kino.fetch(url, options);
  }
  // Fallback para pruebas en Consola / Node.js
  const timeoutMs = options.timeoutMs || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

const safeStorage = {
  get: (key) => {
    if (isKino && kino.storage) try { return kino.storage.get(key); } catch (_) {}
    return null;
  },
  set: (key, val, ttl) => {
    if (isKino && kino.storage) try { kino.storage.set(key, val, ttl); } catch (_) {}
  },
  remove: (key) => {
    if (isKino && kino.storage) try { kino.storage.remove(key); } catch (_) {}
  }
};

const safeConfig = (key, fallback) => {
  if (isKino && kino.config) {
    try {
      const v = kino.config.get(key);
      return (v === undefined || v === null || v === "") ? fallback : v;
    } catch (_) {}
  }
  return fallback;
};

const safeError = (code, msg) => {
  if (isKino && kino.error) return kino.error(code, msg);
  const err = new Error(`[${code}] ${msg}`);
  err.code = code;
  return err;
};

const safeSleep = (ms) => {
  if (isKino && kino.sleep) return kino.sleep(ms);
  return new Promise((r) => setTimeout(r, ms));
};

const safeLog = (...args) => {
  if (isKino && kino.log) try { kino.log(...args); } catch (_) {}
  else console.log("[LOG]", ...args);
};

// ---------- LÍMITES Y MANEJO DE PETICIONES ----------
export const LIMITS = {
  fetchMs: 10000,
  listFetchMs: 6000,
  homeMs: 12000,
  searchMs: 12500,
  resolveMs: 60000,
  breakerFails: 3,
  breakerMs: 5 * 60 * 1000,
};

async function sleepFor(ms, cancel = null) {
  let left = Math.max(0, Math.floor(ms));
  while (left > 0 && !(cancel && cancel.done)) {
    const step = Math.min(cancel ? 250 : 5000, left);
    await safeSleep(step);
    left -= step;
  }
}

export async function within(p, ms, fallback = null) {
  const guarded = Promise.resolve(p).then((v) => ({ v }), (e) => ({ e }));
  if (ms <= 0) return fallback;
  const cancel = { done: false };
  const timer = sleepFor(ms, cancel).then(() => null, () => null);
  try {
    const r = await Promise.race([guarded, timer]);
    if (!r) return fallback;
    if (r.e) throw r.e;
    return r.v;
  } finally {
    cancel.done = true;
  }
}

function siteResting() {
  const h = safeStorage.get("cuevana_health");
  return !!h && (h.until || 0) > Date.now();
}

function siteFailed(code) {
  const h = safeStorage.get("cuevana_health") || {};
  const fails = (h.fails || 0) + 1;
  if (fails >= LIMITS.breakerFails) {
    safeLog(`Cuevana: ${fails} fallas seguidas (${code})`);
    safeStorage.set("cuevana_health", { fails: 0, until: Date.now() + LIMITS.breakerMs }, LIMITS.breakerMs + 60000);
  } else {
    safeStorage.set("cuevana_health", { fails, until: h.until || 0 }, 3600 * 1000);
  }
}

function siteAnswered() {
  safeStorage.remove("cuevana_health");
}

async function siteFetch(url, init = {}, { list = false } = {}) {
  if (list && siteResting()) {
    throw safeError("unavailable", "Cuevana en pausa tras varias fallas");
  }
  try {
    const r = await safeFetch(url, {
      ...init,
      headers: { "User-Agent": UA, ...(init.headers || {}) },
      timeoutMs: init.timeoutMs || (list ? LIMITS.listFetchMs : LIMITS.fetchMs)
    });
    if (r.ok) siteAnswered();
    else if (r.status >= 500 || r.status === 429) siteFailed(`http${r.status}`);
    return r;
  } catch (e) {
    siteFailed(e.code || "network");
    throw safeError("unavailable", `Cuevana error: ${e.code || "network"}`);
  }
}

// ---------- FUNCIONES AUXILIARES DE SCRAPING ----------
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]*>/g, "")
    .trim();
}

function base64Decode(str) {
  try {
    return atob(str);
  } catch (e) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    const cleanStr = (str || '').replace(/[^A-Za-z0-9\+\/\=]/g, '');
    for (let i = 0; i < cleanStr.length;) {
      const enc1 = chars.indexOf(cleanStr.charAt(i++));
      const enc2 = chars.indexOf(cleanStr.charAt(i++));
      const enc3 = chars.indexOf(cleanStr.charAt(i++));
      const enc4 = chars.indexOf(cleanStr.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) output += String.fromCharCode(chr2);
      if (enc4 !== 64 && enc4 !== -1) output += String.fromCharCode(chr3);
    }
    return output;
  }
}

function extractTmdbId(url) {
  const m = url.match(/\/(?:pelicula|serie)\/(\d+)\//);
  return m ? parseInt(m[1], 10) : null;
}

function extractItems(html, limit = 20, isEpisode = false) {
  if (!html) return [];
  const items = [];
  const vistos = new Set();
  const aRegex = /<a[^>]+href="([^"]+(?:\/pelicula\/|\/serie\/)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = aRegex.exec(html)) !== null && items.length < limit) {
    let link = match[1];
    if (isEpisode) {
      if (!link.includes("episodio")) continue;
      link = link.replace(/\/episodio-\d+x\d+/i, "");
    } else {
      if (link.includes("episodio")) continue;
    }
    const innerHtml = match[2];
    const imgMatch = innerHtml.match(/(?:src|data-src|data-lazy)=(?:"([^"]+)"|([^ >]+))/i);
    const titleMatch = innerHtml.match(/<h2[^>]*>([^<]+)<\/h2>/i) || innerHtml.match(/alt="([^"]+)"/i);
    if (imgMatch && titleMatch && !vistos.has(link)) {
      vistos.add(link);
      let poster = imgMatch[1] || imgMatch[2];
      if (poster.startsWith("//")) poster = "https:" + poster;
      if (poster.startsWith("/")) poster = BASE_URL + poster;
      const fullLink = link.startsWith("http") ? link : `${BASE_URL}${link}`;
      const tmdbId = extractTmdbId(fullLink);
      const item = {
        id: "item-" + fullLink.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
        ref: fullLink,
        title: cleanText(titleMatch[1] || titleMatch[2]),
        kind: link.includes("/serie/") ? "series" : "movie",
        poster
      };
      if (tmdbId) item.ids = { tmdb: tmdbId };
      items.push(item);
    }
  }
  return items;
}

// ---------- HANDLERS EXPORTADOS ----------
export async function home() {
  const fetchPage = async (path) => {
    try {
      const res = await siteFetch(`${BASE_URL}${path}`, {}, { list: true });
      if (!res.ok) return "";
      return await res.text();
    } catch (e) { return ""; }
  };

  const loadHomeData = async () => {
    const htmlHome      = await fetchPage("/");
    const htmlPeliculas = await fetchPage("/peliculas");
    const htmlSeries    = await fetchPage("/series");

    const estrenos  = extractItems(htmlHome, 20, false);
    const peliculas = extractItems(htmlPeliculas, 20, false);
    const series    = extractItems(htmlSeries, 20, false);

    const categories = [];
    if (estrenos.length > 0)  categories.push({ id: "estrenos",  title: "🔥 Estrenos Destacados", ref: "estrenos",  items: estrenos });
    if (peliculas.length > 0) categories.push({ id: "peliculas", title: "🎬 Películas Agregadas",  ref: "peliculas", items: peliculas });
    if (series.length > 0)    categories.push({ id: "series",    title: "📺 Series Actualizadas",  ref: "series",    items: series });

    return categories;
  };

  return (await within(loadHomeData(), LIMITS.homeMs, [])) || [];
}

export async function browse(ref, cursor) {
  const paths = {
    "estrenos":  "/",
    "peliculas": "/peliculas",
    "series":    "/series"
  };

  const path = paths[ref];
  if (!path) throw safeError("not_found", "Esa categoría no existe");

  const page = cursor ? Number(cursor) : 1;
  const url = page > 1 ? `${BASE_URL}${path}?page=${page}` : `${BASE_URL}${path}`;

  const res = await siteFetch(url, {}, { list: true });
  if (!res.ok) throw safeError("unavailable", "No se pudo cargar el catálogo");

  const html = await res.text();
  const items = extractItems(html, 40, false);

  return { items, next: items.length >= 10 ? String(page + 1) : undefined };
}

export async function search(query) {
  const qText = typeof query === "string" ? query : (query && query.q ? query.q : "");
  const searchTerm = qText ? encodeURIComponent(qText) : "";
  if (!searchTerm) return [];

  const doSearch = async () => {
    const res = await siteFetch(`${BASE_URL}/explorar?s=${searchTerm}`, {}, { list: true });
    if (!res.ok) return [];
    const html = await res.text();
    return extractItems(html, 50, false);
  };

  return (await within(doSearch(), LIMITS.searchMs, [])) || [];
}

export async function scopedSearch(query, scope) {
  return await search(query);
}

export async function episodes(ref) {
  const res = await siteFetch(ref);
  if (!res.ok) throw safeError("unavailable", "No se pudo obtener información");
  const html = await res.text();
  return { episodes: extractItems(html, 50, true) };
}

export async function resolve(ref) {
  const resolveTask = async () => {
    let targetUrl = ref;
    let selectedServer = null;
    if (ref.includes("|||")) {
      const parts = ref.split("|||");
      targetUrl = parts[0];
      selectedServer = parts[1];
    }
    const res1 = await siteFetch(targetUrl);
    if (!res1.ok) throw safeError("unavailable", "Fallo al contactar el servidor principal");
    const html1 = await res1.text();
    let dynamicKey = 'a45f04ce-2394-47c3-b718-0ecd97ce51d6';
    const keyMatch = html1.match(/["']([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})["']/i);
    if (keyMatch) dynamicKey = keyMatch[1];
    const cuevanaWrappers = [];
    if (selectedServer) {
      let url = selectedServer;
      if (url.includes("?v=")) { try { url = base64Decode(url.split("?v=")[1]); } catch(e) {} }
      if (url.startsWith("//")) url = "https:" + url;
      cuevanaWrappers.push(url);
    } else {
      const serverRegex = /data-server="([^"]+)"/g;
      let match;
      while ((match = serverRegex.exec(html1)) !== null) {
        let url = match[1];
        if (url.includes("?v=")) { try { url = base64Decode(url.split("?v=")[1]); } catch(e) {} }
        if (url.startsWith("//")) url = "https:" + url;
        if (url.includes("tungtungsahur")) cuevanaWrappers.push(url);
      }
    }
    if (cuevanaWrappers.length === 0) throw safeError("not_found", "No hay servidores disponibles");

    for (const url of cuevanaWrappers) {
      try {
        const tokenMatch = url.match(/token=([^&]+)/);
        if (!tokenMatch) continue;
        const token = tokenMatch[1];
        const serverIndex = token[0];
        const encodedData = token.slice(1);
        const serversDict = {
          '1': 'https://lkhjerbhye3wjkhodvh5xiczuvd.lol/v/',
          '2': 'https://filemoon.sx/e/',
          '3': 'https://lkhjerbhye3wjkhodvh5xlczuvd.lol/e/',
          '4': 'https://dood.li/e/'
        };
        if (!serversDict[serverIndex]) continue;
        const decoded = base64Decode(encodedData);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
          decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ dynamicKey.charCodeAt(i % dynamicKey.length));
        }
        const iframeUrl = serversDict[serverIndex] + decrypted;
        const res3 = await siteFetch(iframeUrl, { headers: { "Referer": url } });
        if (!res3.ok) continue;
        const html3 = await res3.text();
        const originMatch = iframeUrl.match(/^(https?:\/\/[^\/]+)/i);
        const originUrl = originMatch ? originMatch[1] : iframeUrl;
        const scripts = html3.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        if (!scripts) continue;
        for (const s of scripts) {
          if (s.includes('eval(function(p,a,c,k,e,d)')) {
            const scriptSospechoso = s.replace(/<script[^>]*>|<\/script>/gi, "").trim();
            const packerMatch = scriptSospechoso.match(/eval\((function\(p,a,c,k,e,d\)[\s\S]+)\)/);
            if (packerMatch) {
              let unpackedCode = "";
              try { unpackedCode = new Function("return (" + packerMatch[1] + ");")(); } catch (err) { continue; }
              const streamFinal =
                unpackedCode.match(/https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4)[^"'\s\\]*/i) ||
                unpackedCode.match(/(?:file|src|url)\s*:\s*["'](https?:\/\/[^"']+)["']/i);
              if (streamFinal) {
                let streamUrl = streamFinal[1] || streamFinal[0];
                return { url: streamUrl, headers: { "Referer": iframeUrl, "Origin": originUrl, "User-Agent": UA } };
              }
            }
          }
        }
      } catch (innerError) { continue; }
    }
    throw safeError("not_found", "No se pudo resolver el stream");
  };

  return await within(resolveTask(), LIMITS.resolveMs);
}

// ---------- HANDLERS DE CONFIGURACIÓN ----------
// ---------- HANDLERS DE CONFIGURACIÓN Y ESTADO (SDK v6) ----------

export async function settingStatus(key) {
  if (key === "state") {
    return {
      label: siteResting() ? "Pausado (Reintentando pronto)" : "Operativo",
      value: siteResting() ? "degraded" : "ok"
    };
  }
  return null;
}

export async function action(key) {
  if (key === "clear") {
    safeStorage.remove("cuevana_health");
    return { userMessage: "Memoria temporal borrada correctamente." };
  }
  return null;
}

// Alias para compatibilidad con el runtime de Kino sin redeclarar variables
export { settingStatus as onSettingStatus, action as onAction };