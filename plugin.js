const BASE_URL = "https://cuevana3k.pro";

function log(...args) {
  try { kino.log(...args); } catch { }
}

function cleanText(text) {
  if (!text) return "";
let result = text
    .replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]*>/g, "")
    .trim();

  // Opción A: Formatear a "SERIE: Nombre" y "PELÍCULA: Nombre"
  result = result.replace(/^Serie\s+/i, "SERIE: ");
  result = result.replace(/^Pel[ií]cula\s+/i, "PELÍCULA: ");
  return result;

}
export async function section({ tab }) { 
  const tabs = [
    { id: "pelis", label: "Películas" }, 
    { id: "series", label: "Series" }
  ];
  
  const chosen = tabs.some((t) => t.id === tab) ? tab : "pelis";

  const fetchPage = async (path) => {
    try {
      const res = await kino.fetch(`${BASE_URL}${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return "";
      return await res.text();
    } catch (e) { return ""; }
  };

  let heroItem = null;
  const rows = [];

  if (chosen === "pelis") {
    // Peticiones simultáneas para mayor velocidad
    const [
      htmlPopulares, htmlPeliculas, htmlEstrenos,
      htmlAccion, htmlComedia, htmlTerror, htmlAnimacion,
      htmlAnime, htmlCienciaFiccion, htmlSuspenso, htmlDrama
    ] = await Promise.all([
      fetchPage("/tendencias"), fetchPage("/peliculas"), fetchPage("/"),
      fetchPage("/peliculas?genero=accion"), fetchPage("/peliculas?genero=comedia"),
      fetchPage("/peliculas?genero=terror"), fetchPage("/peliculas?genero=animacion"),
      fetchPage("/peliculas?genero=anime"), fetchPage("/peliculas?genero=ciencia-ficcion"),
      fetchPage("/peliculas?genero=suspenso"), fetchPage("/peliculas?genero=drama")
    ]);

    const populares  = extractItems(htmlPopulares, 20, false);
    const peliculas  = extractItems(htmlPeliculas, 20, false);
    const estrenos   = extractItems(htmlEstrenos, 20, false);
    const accion     = extractItems(htmlAccion, 20, false);
    const comedia    = extractItems(htmlComedia, 20, false);
    const terror     = extractItems(htmlTerror, 20, false);
    const animacion  = extractItems(htmlAnimacion, 20, false);
    const anime      = extractItems(htmlAnime, 20, false);
    const cienciaFic = extractItems(htmlCienciaFiccion, 20, false);
    const suspenso   = extractItems(htmlSuspenso, 20, false);
    const drama      = extractItems(htmlDrama, 20, false);

    if (populares.length > 0) heroItem = populares[0];
    else if (estrenos.length > 0) heroItem = estrenos[0];

    if (estrenos.length > 0)  rows.push({ id: "estrenos",  title: "🔥 Estrenos Destacados", ref: "estrenos",  items: estrenos });
    if (populares.length > 0) rows.push({ id: "populares", title: "⭐ Películas Populares", ref: "populares", items: populares });
    if (peliculas.length > 0) rows.push({ id: "peliculas", title: "🎬 Películas Agregadas", ref: "peliculas", items: peliculas });
    if (accion.length > 0)    rows.push({ id: "accion",    title: "💥 Acción",              ref: "accion",    items: accion });
    if (comedia.length > 0)   rows.push({ id: "comedia",   title: "😂 Comedia",             ref: "comedia",   items: comedia });
    if (terror.length > 0)    rows.push({ id: "terror",    title: "👻 Terror",              ref: "terror",    items: terror });
    if (animacion.length > 0) rows.push({ id: "animacion", title: "🎨 Animación",           ref: "animacion", items: animacion });
    if (anime.length > 0)     rows.push({ id: "anime",     title: "🎌 Anime",               ref: "anime",     items: anime });
    if (cienciaFic.length > 0)rows.push({ id: "sci-fi",    title: "🚀 Ciencia Ficción",     ref: "sci-fi",    items: cienciaFic });
    if (suspenso.length > 0)  rows.push({ id: "suspenso",  title: "🔍 Suspenso",            ref: "suspenso",  items: suspenso });
    if (drama.length > 0)     rows.push({ id: "drama",     title: "🎭 Drama",               ref: "drama",     items: drama });

  } else if (chosen === "series") {
    // Adaptamos las URL para extraer los géneros específicos de series
    const [
      htmlSeries, htmlHome,
      htmlAccion, htmlComedia, htmlTerror, htmlAnimacion,
      htmlAnime, htmlCienciaFiccion, htmlSuspenso, htmlDrama
    ] = await Promise.all([
      fetchPage("/series"), fetchPage("/"),
      fetchPage("/series?genero=accion"), fetchPage("/series?genero=comedia"),
      fetchPage("/series?genero=terror"), fetchPage("/series?genero=animacion"),
      fetchPage("/series?genero=anime"), fetchPage("/series?genero=ciencia-ficcion"),
      fetchPage("/series?genero=suspenso"), fetchPage("/series?genero=drama")
    ]);

    const series      = extractItems(htmlSeries, 20, false);
    const episodios   = extractItems(htmlHome, 20, true);
    const accion      = extractItems(htmlAccion, 20, false);
    const comedia     = extractItems(htmlComedia, 20, false);
    const terror      = extractItems(htmlTerror, 20, false);
    const animacion   = extractItems(htmlAnimacion, 20, false);
    const anime       = extractItems(htmlAnime, 20, false);
    const cienciaFic  = extractItems(htmlCienciaFiccion, 20, false);
    const suspenso    = extractItems(htmlSuspenso, 20, false);
    const drama       = extractItems(htmlDrama, 20, false);

    if (series.length > 0) heroItem = series[0];
    else if (episodios.length > 0) heroItem = episodios[0];

    if (series.length > 0)     rows.push({ id: "series",     title: "📺 Series Actualizadas",  ref: "series",     items: series });
    if (episodios.length > 0)  rows.push({ id: "episodios",  title: "🆕 Últimos Episodios",    ref: "episodios",  items: episodios });
    // Usamos el prefijo "s-" en el ref para diferenciarlas de las películas al usar el botón "Ver más"
    if (accion.length > 0)     rows.push({ id: "s-accion",   title: "💥 Acción",              ref: "s-accion",   items: accion });
    if (comedia.length > 0)    rows.push({ id: "s-comedia",  title: "😂 Comedia",             ref: "s-comedia",  items: comedia });
    if (terror.length > 0)     rows.push({ id: "s-terror",   title: "👻 Terror",              ref: "s-terror",   items: terror });
    if (animacion.length > 0)  rows.push({ id: "s-animacion",title: "🎨 Animación",           ref: "s-animacion",items: animacion });
    if (anime.length > 0)      rows.push({ id: "s-anime",    title: "🎌 Anime",               ref: "s-anime",    items: anime });
    if (cienciaFic.length > 0) rows.push({ id: "s-sci-fi",   title: "🚀 Ciencia Ficción",     ref: "s-sci-fi",   items: cienciaFic });
    if (suspenso.length > 0)   rows.push({ id: "s-suspenso", title: "🔍 Suspenso",            ref: "s-suspenso", items: suspenso });
    if (drama.length > 0)      rows.push({ id: "s-drama",    title: "🎭 Drama",               ref: "s-drama",    items: drama });
  }

  let hero = { title: "Destacado", text: "Explora el mejor contenido disponible." };
  if (heroItem) {
    hero = {
      title: heroItem.title,
      text: chosen === "series" ? "Disfruta de esta serie destacada." : "Disfruta de esta película destacada.",
      image: heroItem.poster
    };
  }

  return { tabs, tab: chosen, hero, rows };
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

export async function home() {
  const fetchPage = async (path) => {
    try {
      const res = await kino.fetch(`${BASE_URL}${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return "";
      return await res.text();
    } catch (e) { return ""; }
  };

  // Secciones principales y géneros de películas
  const htmlHome          = await fetchPage("/");
  const htmlPeliculas     = await fetchPage("/peliculas");
  const htmlSeries        = await fetchPage("/series");
  const htmlPopulares     = await fetchPage("/tendencias");
  const htmlAccion        = await fetchPage("/peliculas?genero=accion");
  const htmlComedia       = await fetchPage("/peliculas?genero=comedia");
  const htmlTerror        = await fetchPage("/peliculas?genero=terror");
  const htmlAnimacion     = await fetchPage("/peliculas?genero=animacion");
  const htmlAnime         = await fetchPage("/peliculas?genero=anime");
  const htmlCienciaFiccion = await fetchPage("/peliculas?genero=ciencia-ficcion");
  const htmlSuspenso      = await fetchPage("/peliculas?genero=suspenso");
  const htmlDrama         = await fetchPage("/peliculas?genero=drama");

  const estrenos         = extractItems(htmlHome, 20, false);
  const ultimosEpisodios = extractItems(htmlHome, 20, true);
  const peliculas        = extractItems(htmlPeliculas, 20, false);
  const series           = extractItems(htmlSeries, 20, false);
  const populares        = extractItems(htmlPopulares, 20, false);
  
  const accion           = extractItems(htmlAccion, 20, false);
  const comedia          = extractItems(htmlComedia, 20, false);
  const terror           = extractItems(htmlTerror, 20, false);
  const animacion        = extractItems(htmlAnimacion, 20, false);
  const anime            = extractItems(htmlAnime, 20, false);
  const cienciaFic       = extractItems(htmlCienciaFiccion, 20, false);
  const suspenso         = extractItems(htmlSuspenso, 20, false);
  const drama            = extractItems(htmlDrama, 20, false);

  const categories = [];
  
  if (estrenos.length > 0)         categories.push({ id: "estrenos",  title: "🔥 Estrenos Destacados", ref: "estrenos",  items: estrenos });
  if (ultimosEpisodios.length > 0) categories.push({ id: "episodios", title: "🆕 Últimos Episodios",   ref: "episodios", items: ultimosEpisodios });
  if (populares.length > 0)        categories.push({ id: "populares", title: "⭐ Películas Populares",  ref: "populares", items: populares });
  if (peliculas.length > 0)        categories.push({ id: "peliculas", title: "🎬 Películas Agregadas",  ref: "peliculas", items: peliculas });
  if (series.length > 0)           categories.push({ id: "series",    title: "📺 Series Actualizadas",  ref: "series",    items: series });
  
  if (accion.length > 0)           categories.push({ id: "accion",    title: "💥 Acción",              ref: "accion",    items: accion });
  if (comedia.length > 0)          categories.push({ id: "comedia",   title: "😂 Comedia",             ref: "comedia",   items: comedia });
  if (terror.length > 0)           categories.push({ id: "terror",    title: "👻 Terror",              ref: "terror",    items: terror });
  if (animacion.length > 0)        categories.push({ id: "animacion", title: "🎨 Animación",           ref: "animacion", items: animacion });
  if (anime.length > 0)            categories.push({ id: "anime",     title: "🎌 Anime",               ref: "anime",     items: anime });
  if (cienciaFic.length > 0)       categories.push({ id: "sci-fi",    title: "🚀 Ciencia Ficción",     ref: "sci-fi",    items: cienciaFic });
  if (suspenso.length > 0)         categories.push({ id: "suspenso",  title: "🔍 Suspenso",            ref: "suspenso",  items: suspenso });
  if (drama.length > 0)            categories.push({ id: "drama",     title: "🎭 Drama",               ref: "drama",     items: drama });

  return categories;
}

export async function browse(ref, cursor) {
  await null;

  const paths = {
    "estrenos":  "/",
    "episodios": "/",
    "populares": "/tendencias",
    "peliculas": "/peliculas",
    "series":    "/series",
    "accion":    "/peliculas?genero=accion",
    "comedia":   "/peliculas?genero=comedia",
    "terror":    "/peliculas?genero=terror",
    "animacion": "/peliculas?genero=animacion",
    "anime":     "/peliculas?genero=anime",
    "sci-fi":    "/peliculas?genero=ciencia-ficcion",
    "suspenso":  "/peliculas?genero=suspenso",
    "drama":     "/peliculas?genero=drama"
  };

  const path = paths[ref];
  if (!path) throw kino.error("not_found", "esa fila ya no existe");

  const page = cursor ? Number(cursor) : 1;

  const url = page > 1
    ? `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}page=${page}`
    : `${BASE_URL}${path}`;

  const res = await kino.fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw kino.error("not_found", "no se pudo cargar la página");

  const html = await res.text();
  const items = extractItems(html, 40, ref === "episodios");

  return {
    items,
    next: items.length >= 10 ? String(page + 1) : undefined
  };
}

export async function search(query) {
  const searchTerm = (query && query.q) ? encodeURIComponent(query.q) : "";
  const res = await kino.fetch(`${BASE_URL}/explorar?s=${searchTerm}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return [];
  const html = await res.text();
  const results = [];
  const vistos = new Set();
  const aRegex = /<a[^>]+href="([^"]+(?:\/pelicula\/|\/serie\/)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = aRegex.exec(html)) !== null && results.length < 50) {
    let link = match[1];
    if (link.includes("episodio")) continue;
    const innerHtml = match[2];
    const imgMatch = innerHtml.match(/src=(?:"([^"]+)"|([^ >]+))/i);
    const titleMatch = innerHtml.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i) || innerHtml.match(/alt="([^"]+)"/i);
    const yearMatch = innerHtml.match(/<span class="Year">(\d+)<\/span>/i);
    if (imgMatch && titleMatch && !vistos.has(link)) {
      vistos.add(link);
      let poster = imgMatch[1] || imgMatch[2];
      if (poster.startsWith("//")) poster = "https:" + poster;
      const fullLink = link.startsWith("http") ? link : `${BASE_URL}${link}`;
      const tmdbId = extractTmdbId(fullLink);
      const item = {
        id: "item-" + fullLink.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
        ref: fullLink,
        title: cleanText(titleMatch[1] || titleMatch[2]),
        kind: link.includes("/serie/") ? "series" : "movie",
        poster
      };
      if (yearMatch) item.year = parseInt(yearMatch[1], 10);
      if (tmdbId) item.ids = { tmdb: tmdbId };
      results.push(item);
    }
  }
  return results;
}

export async function episodes(ref) {
  const res = await kino.fetch(ref, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("No se pudo obtener la serie");
  const html = await res.text();

  const descMatch = html.match(/<p[^>]*>\s*([^<]{30,})\s*<\/p>/i);
  const overview = descMatch ? cleanText(descMatch[1]) : "";
  const tmdbId = extractTmdbId(ref);

  const seasonRegex = /<a[^>]+href="([^"]+\/temporada-\d+)"/gi;
  const seasonLinks = [];
  let sMatch;
  while ((sMatch = seasonRegex.exec(html)) !== null) {

    let sLink = sMatch[1];
    if (!sLink.startsWith("http")) sLink = BASE_URL + sLink;
    if (!seasonLinks.includes(sLink)) seasonLinks.push(sLink);
  }

  const episodesList = [];
  const vistos = new Set();

  if (seasonLinks.length > 0) {
    const seasonHtmls = await Promise.all(
      seasonLinks.map(link => kino.fetch(link).then(r => r.ok ? r.text() : "").catch(() => ""))
    );
    for (const sHtml of seasonHtmls) {
      if (!sHtml) continue;
      const epRegex = /<a[^>]+href="([^"]+\/episodio-\d+x\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let epMatch;
      while ((epMatch = epRegex.exec(sHtml)) !== null) {
        
        //if (episodesList.length === 0) throw new Error(epMatch[2].substring(0, 500)); // DEBUG
        
        let epRef = epMatch[1];
        if (!epRef.startsWith("http")) epRef = BASE_URL + epRef;
        if (vistos.has(epRef)) continue;
        vistos.add(epRef);
        let season = 1, number = 1;
        const numMatch = epRef.match(/episodio-(\d+)x(\d+)/i);
        if (numMatch) {
          season = parseInt(numMatch[1], 10);
          number = parseInt(numMatch[2], 10);
        }
        const titleMatch = epMatch[2].match(/<span[^>]*>([^<]+)<\/span>/i) || epMatch[2].match(/alt="([^"]+)"/i);
       const imgMatch = epMatch[2].match(/src=(?:"([^"]+)"|([^ >]+))/i);
let still = imgMatch ? (imgMatch[1] || imgMatch[2]) : null;
if (still && still.startsWith("//")) still = "https:" + still;
const epObj = { season, number, ref: epRef, title: `Episodio ${number}` };
if (still) epObj.still = still;
episodesList.push(epObj);
      }
    }
  }

  if (episodesList.length === 0) {
    let count = 1;
    const urlsVistas = new Set();
    let foundServers = false;
    const containerRegex = /class="tab-video-item">([\s\S]*?)<div[^>]*class="tab-item-name"[^>]*>\s*([^<\n]+)[\s\S]*?<ul>([\s\S]*?)<\/ul>/gi;
    let cMatch;
    while ((cMatch = containerRegex.exec(html)) !== null) {
      const langName = cleanText(cMatch[2]);
      const serversHtml = cMatch[3];
      const serverRegex = /<li[^>]*data-server="([^"]+)"[^>]*>([\s\S]*?)<\/li>/gi;
      let serverMatch;
      while ((serverMatch = serverRegex.exec(serversHtml)) !== null) {
        const serverUrl = serverMatch[1];
        if (urlsVistas.has(serverUrl)) continue;
        urlsVistas.add(serverUrl);
        foundServers = true;
        const rawInner = serverMatch[2];
        const nameMatch = rawInner.match(/<span[^>]*>([^<]+)<\/span>/i);
        let serverName = nameMatch ? cleanText(nameMatch[1]) : `Servidor ${count}`;
        if (!serverName || serverName.length < 2) serverName = `Servidor ${count}`;
        episodesList.push({ season: 1, number: count, ref: `${ref}|||${serverUrl}`, title: `${langName} - ${serverName}` });
        count++;
      }
    }
    if (!foundServers) {
      const fallbackRegex = /<li[^>]*data-server="([^"]+)"[^>]*>([\s\S]*?)<\/li>/gi;
      let fMatch;
      while ((fMatch = fallbackRegex.exec(html)) !== null) {
        const serverUrl = fMatch[1];
        if (urlsVistas.has(serverUrl)) continue;
        urlsVistas.add(serverUrl);
        episodesList.push({ season: 1, number: count, ref: `${ref}|||${serverUrl}`, title: `Opción ${count}` });
        count++;
      }
    }
    if (episodesList.length === 0) {
      episodesList.push({ season: 1, number: 1, ref: ref, title: "Reproducir Película" });
    }
  }

  episodesList.sort((a, b) => (a.season - b.season) || (a.number - b.number));
  const result = { episodes: episodesList };
  const seriesInfo = {};
  if (overview) seriesInfo.overview = overview;
  if (tmdbId) seriesInfo.ids = { tmdb: tmdbId };
  if (Object.keys(seriesInfo).length > 0) result.series = seriesInfo;
  return result;
}

export async function resolve(ref) {
  await null;
  try {
    let targetUrl = ref;
    let selectedServer = null;
    if (ref.includes("|||")) {
      const parts = ref.split("|||");
      targetUrl = parts[0];
      selectedServer = parts[1];
    }
    
    const res1 = await kino.fetch(targetUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res1.ok) throw kino.error("unavailable", "Fallo al contactar el servidor principal de Cuevana", { userMessage: "Cuevana no responde en este momento. Intenta de nuevo más tarde." });
    const html1 = await res1.text();
    
    let dynamicKey = 'a45f04ce-2394-47c3-b718-0ecd97ce51d6';
    const keyMatch = html1.match(/["']([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})["']/i);
    if (keyMatch) dynamicKey = keyMatch[1];
    
    // Novedad: Guardamos un objeto con la URL y su IDIOMA
    const cuevanaWrappers = [];
    if (selectedServer) {
      let url = selectedServer;
      if (url.includes("?v=")) { try { url = base64Decode(url.split("?v=")[1]); } catch(e) {} }
      if (url.startsWith("//")) url = "https:" + url;
      // Si es una serie, el idioma ya lo muestra la lista de episodios
      cuevanaWrappers.push({ url, lang: "" }); 
    } else {
      // Extraemos los bloques de idiomas (Latino, Castellano, Subtitulado)
      const containerRegex = /class="tab-video-item">([\s\S]*?)<div[^>]*class="tab-item-name"[^>]*>\s*([^<\n]+)[\s\S]*?<ul>([\s\S]*?)<\/ul>/gi;
      let cMatch;
      let foundLangs = false;
      while ((cMatch = containerRegex.exec(html1)) !== null) {
        foundLangs = true;
        let langName = cleanText(cMatch[2]) || "Latino";
        const serversHtml = cMatch[3];
        const serverRegex = /data-server="([^"]+)"/g;
        let match;
        while ((match = serverRegex.exec(serversHtml)) !== null) {
          let url = match[1];
          if (url.includes("?v=")) { try { url = base64Decode(url.split("?v=")[1]); } catch(e) {} }
          if (url.startsWith("//")) url = "https:" + url;
          if (url.includes("tungtungsahur")) cuevanaWrappers.push({ url, lang: langName });
        }
      }
      // Respaldo por si la estructura cambia
      if (!foundLangs) {
        const serverRegex = /data-server="([^"]+)"/g;
        let match;
        while ((match = serverRegex.exec(html1)) !== null) {
          let url = match[1];
          if (url.includes("?v=")) { try { url = base64Decode(url.split("?v=")[1]); } catch(e) {} }
          if (url.startsWith("//")) url = "https:" + url;
          if (url.includes("tungtungsahur")) cuevanaWrappers.push({ url, lang: "Español" });
        }
      }
    }
    
    if (cuevanaWrappers.length === 0) throw kino.error("not_found", "No hay servidores disponibles", { userMessage: "No se encontraron servidores de video en la página." });
    
    let pref = "3";
    try { pref = kino.config.get("servidor_pref") ?? "3"; } catch(e) {}
    
    if (pref !== "cualquiera") {
      // Guardamos el índice original para no mezclar los idiomas al ordenar
      cuevanaWrappers.forEach((item, i) => item.index = i);
      cuevanaWrappers.sort((a, b) => {
        const indexA = (a.url.match(/token=([^&]+)/) || [])[1]?.[0];
        const indexB = (b.url.match(/token=([^&]+)/) || [])[1]?.[0];
        
        const isPrefA = indexA === pref ? 1 : 0;
        const isPrefB = indexB === pref ? 1 : 0;
        
        if (isPrefA !== isPrefB) return isPrefB - isPrefA; // El preferido va primero
        return a.index - b.index; // Mantiene el orden original (ej. Latino antes que Subtitulado)
      });
    }

    const extractPromises = cuevanaWrappers.map(async (wrapper) => {
      try {
        const tokenMatch = wrapper.url.match(/token=([^&]+)/);
        if (!tokenMatch) return null;
        const token = tokenMatch[1];
        const serverIndex = token[0];
        const encodedData = token.slice(1);
        
        const serversDict = {
          '1': { baseUrl: 'https://lkhjerbhye3wjkhodvh5xiczuvd.lol/v/', name: 'Hyper' },
          '2': { baseUrl: 'https://filemoon.sx/e/', name: 'Filemoon' },
          '3': { baseUrl: 'https://lkhjerbhye3wjkhodvh5xlczuvd.lol/e/', name: 'Nebula' },
          '4': { baseUrl: 'https://dood.li/e/', name: 'Doodstream' }
        };
        
        if (!serversDict[serverIndex]) return null;
        const sInfo = serversDict[serverIndex];
        
        const decoded = base64Decode(encodedData);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
          decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ dynamicKey.charCodeAt(i % dynamicKey.length));
        }
        
        const iframeUrl = sInfo.baseUrl + decrypted;
        
        const res3 = await kino.fetch(iframeUrl, { 
          headers: { "Referer": wrapper.url, "User-Agent": "Mozilla/5.0" },
          timeoutMs: 8000 
        });
        if (!res3.ok) return null;
        
        const html3 = await res3.text();
        const originMatch = iframeUrl.match(/^(https?:\/\/[^\/]+)/i);
        const originUrl = originMatch ? originMatch[1] : iframeUrl;
        
        let streamUrl = null;
        const findStreamInCode = (code) => {
          const streamFinal =
            code.match(/https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4)[^"'\s\\]*/i) ||
            code.match(/(?:file|src|url)\s*:\s*["'](https?:\/\/[^"']+)["']/i);
          if (streamFinal) return streamFinal[1] || streamFinal[0];
          return null;
        };

        const scripts = html3.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        if (scripts) {
          for (const s of scripts) {
            if (s.includes('eval(function(p,a,c,k,e,d)')) {
              const scriptSospechoso = s.replace(/<script[^>]*>|<\/script>/gi, "").trim();
              const packerMatch = scriptSospechoso.match(/eval\((function\(p,a,c,k,e,d\)[\s\S]+)\)/);
              if (packerMatch) {
                try {
                  const unpackedCode = new Function("return (" + packerMatch[1] + ");")();
                  streamUrl = findStreamInCode(unpackedCode);
                  if (streamUrl) break;
                } catch (err) {}
              }
            } else {
              streamUrl = findStreamInCode(s);
              if (streamUrl) break;
            }
          }
        }
        
        if (!streamUrl) streamUrl = findStreamInCode(html3);
        
        if (streamUrl) {
          if (streamUrl.includes('.urlset/master.m3u8')) {
            streamUrl = streamUrl.replace(/,[a-z,]+\.urlset\/master\.m3u8/, 'h/index.m3u8');
          }
          
          // Novedad: Formateamos la etiqueta para que muestre "Latino - Nebula"
          const finalLabel = wrapper.lang ? `${wrapper.lang} - ${sInfo.name}` : sInfo.name;
          
          return {
            label: finalLabel,
            url: streamUrl,
            headers: { 
              "Referer": iframeUrl, 
              "Origin": originUrl, 
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 
              "Accept": "*/*" 
            }
          };
        }
        return null;
      } catch (innerError) { return null; }
    });

    const results = await Promise.all(extractPromises);
    
    const validStreams = [];
    const seenUrls = new Set();
    
    for (const res of results) {
      if (res && !seenUrls.has(res.url)) {
        seenUrls.add(res.url);
        validStreams.push(res);
      }
    }

    if (validStreams.length === 0) {
      throw kino.error("unavailable", "Se intentaron todos los servidores pero ninguno entregó el video.", { userMessage: "Los servidores de este video están inactivos por el momento."});
    }

    const primary = validStreams[0];
    const finalResponse = {
      url: primary.url,
      headers: primary.headers
    };

    if (validStreams.length > 1) {
      finalResponse.alternatives = validStreams.slice(1).map(s => ({
        label: s.label,
        url: s.url,
        headers: s.headers
      }));
    }

    return finalResponse;

  } catch (e) {
    if (e && e.code) throw e;
    throw kino.error("unavailable", String(e), { userMessage: "Hubo un problema cargando este contenido. Intenta de nuevo más tarde." });
  }
}