const BASE_URL = "https://cuevana3e.pro";

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

export async function home() {
  const res = await kino.fetch(`${BASE_URL}/`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return [];
  const html = await res.text();
  const items = [];
  const vistos = new Set();
  const aRegex = /<a[^>]+href="([^"]+(?:\/pelicula\/|\/serie\/)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = aRegex.exec(html)) !== null && items.length < 40) {
    let link = match[1];
    if (link.includes("episodio")) continue;
    const innerHtml = match[2];
    //const imgMatch = innerHtml.match(/src=(?:"([^"]+)"|([^ >]+))/i);
    const imgMatch = innerHtml.match(/(?:src|data-src|data-lazy)=(?:"([^"]+)"|([^ >]+))/i);
    const titleMatch = innerHtml.match(/<h2[^>]*>([^<]+)<\/h2>/i) || innerHtml.match(/alt="([^"]+)"/i);
    const yearMatch = innerHtml.match(/<span class="Year">(\d+)<\/span>/i);
    if (imgMatch && titleMatch && !vistos.has(link)) {
      vistos.add(link);
      let poster = imgMatch[1] || imgMatch[2];
      if (poster.startsWith("//")) poster = "https:" + poster;
      if (poster.startsWith("/")) poster = BASE_URL + poster;
      const item = {
        id: link.replace(BASE_URL, "").replace(/[^a-zA-Z0-9_-]/g, "") || ("item-" + items.length),
        ref: link.startsWith("http") ? link : `${BASE_URL}${link}`,
        title: cleanText(titleMatch[1] || titleMatch[2]),
        kind: link.includes("/serie/") ? "series" : "movie",
        poster: poster
      };
      if (yearMatch) item.year = parseInt(yearMatch[1], 10);
      items.push(item);
    }
  }
  return [{ id: "recientes", title: "Recientes en Cuevana", items: items }];
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
      const item = {
        id: link.replace(BASE_URL, "").replace(/[^a-zA-Z0-9_-]/g, "") || ("search-" + results.length),
        ref: link.startsWith("http") ? link : `${BASE_URL}${link}`,
        title: cleanText(titleMatch[1] || titleMatch[2]),
        kind: link.includes("/serie/") ? "series" : "movie",
        poster: poster
      };
      if (yearMatch) item.year = parseInt(yearMatch[1], 10);
      results.push(item);
    }
  }
  return results;
}

export async function episodes(ref) {
  const res = await kino.fetch(ref, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("No se pudo obtener la serie");
  const html = await res.text();

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

        const epObj = {
          season,
          number,
          ref: epRef,
          title: titleMatch ? cleanText(titleMatch[1]) : `Episodio ${number}`
        };
        if (still) epObj.still = still;
        episodesList.push(epObj);
      }
    }
  }

  // --- Modificación: manejo de películas con lista de servidores ---
  if (episodesList.length === 0) {
    const serverRegex = /<li[^>]*data-server="([^"]+)"[^>]*>([\s\S]*?)<\/li>/gi;
    let sMatch;
    let count = 1;

    while ((sMatch = serverRegex.exec(html)) !== null) {
      let serverUrl = sMatch[1];
      //let serverName = cleanText(sMatch[2]);
      const rawInner = sMatch[2];
        const nameMatch = rawInner.match(/<span[^>]*>([^<]+)<\/span>/i) ||
                    rawInner.match(/<strong[^>]*>([^<]+)<\/strong>/i) ||
                    rawInner.match(/<[^>]+>([^<]+)<\/[^>]+>/i);
      let serverName = nameMatch ? cleanText(nameMatch[1]) : cleanText(rawInner.replace(/<[^>]+>/g, ' ').trim());
      if (!serverName || serverName.length < 2) serverName = `Opción ${count}`;

      episodesList.push({
        season: 1,
        number: count,
        ref: `${ref}|||${serverUrl}`,  // puente película + servidor elegido
        title: serverName
      });
      count++;
    }

    // Fallback si la estructura del HTML cambia
    if (episodesList.length === 0) {
      episodesList.push({ season: 1, number: 1, ref: ref, title: "Reproducir Película" });
    }
  }

  episodesList.sort((a, b) => (a.season - b.season) || (a.number - b.number));
  return { episodes: episodesList };
}


export async function resolve(ref) {
  try {
    // --- Modificación: separamos ref compuesto película|||servidor ---
    let targetUrl = ref;
    let selectedServer = null;

    if (ref.includes("|||")) {
      const parts = ref.split("|||");
      targetUrl = parts[0];
      selectedServer = parts[1];
    }

    const res1 = await kino.fetch(targetUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res1.ok) throw new Error("Fallo al contactar el servidor principal");
    const html1 = await res1.text();

    // Paso 3: llave dinámica con fallback estático
    let dynamicKey = 'a45f04ce-2394-47c3-b718-0ecd97ce51d6';
    const keyMatch = html1.match(/["']([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})["']/i);
    if (keyMatch) dynamicKey = keyMatch[1];

    const cuevanaWrappers = [];

    if (selectedServer) {
      // Película: procesamos solo el servidor que el usuario eligió
      let url = selectedServer;
      if (url.includes("?v=")) {
        try { url = base64Decode(url.split("?v=")[1]); } catch(e) {}
      }
      if (url.startsWith("//")) url = "https:" + url;
      cuevanaWrappers.push(url);
    } else {
      // Serie: comportamiento original, iteramos todos los servidores
      const serverRegex = /data-server="([^"]+)"/g;
      const servers = [];
      let match;
      while ((match = serverRegex.exec(html1)) !== null) servers.push(match[1]);

      for (const s of servers) {
        let url = s;
        if (s.includes("?v=")) {
          try { url = base64Decode(s.split("?v=")[1]); } catch(e) {}
        }
        if (url.startsWith("//")) url = "https:" + url;
        if (url.includes("tungtungsahur")) cuevanaWrappers.push(url);
      }
    }

    if (cuevanaWrappers.length === 0) throw new Error("No hay servidores disponibles");

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

        // Paso 3: desencriptado con llave dinámica
        const decoded = base64Decode(encodedData);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
          decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ dynamicKey.charCodeAt(i % dynamicKey.length));
        }

        const iframeUrl = serversDict[serverIndex] + decrypted;

        const res3 = await kino.fetch(iframeUrl, { headers: { "Referer": url, "User-Agent": "Mozilla/5.0" } });
        if (!res3.ok) continue;
        const html3 = await res3.text();

        // Paso 4: origen por regex
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
              try {
                // Paso 4: desempaquetador aislado
                unpackedCode = new Function("return (" + packerMatch[1] + ");")();
              } catch (err) {
                continue;
              }

              const streamFinal =
                unpackedCode.match(/https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4)[^"'\s\\]*/i) ||
                unpackedCode.match(/(?:file|src|url)\s*:\s*["'](https?:\/\/[^"']+)["']/i);

              if (streamFinal) {
                // Paso 4: cabeceras extendidas
                return {
                  url: streamFinal[1] || streamFinal[0],
                  headers: {
                    "Referer": iframeUrl,
                    "Origin": originUrl,
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "*/*"
                  }
                };
              }
            }
          } else {
            const streamFinal =
              html3.match(/https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4)[^"'\s\\]*/i) ||
              html3.match(/(?:file|src|url)\s*:\s*["'](https?:\/\/[^"']+)["']/i);

            if (streamFinal) {
              return {
                url: streamFinal[1] || streamFinal[0],
                headers: { "Referer": iframeUrl }
              };
            }
          }
        }
      } catch (innerError) {
        continue;
      }
    }

    throw new Error("Se intentaron todos los servidores pero ninguno entregó el video.");
  } catch (e) {
    throw new Error(String(e));
  }
}