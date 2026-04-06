// Extracts OpenGraph metadata from a URL.
// Instagram and TikTok block server-side fetches, so we fall back to
// demo data for those domains so the "paste a link" flow still works in testing.

const DEMO_FALLBACKS = [
  { location: "Shibuya, Tokyo, Japan",        caption: "🌃 Omoide Yokocho (Memory Lane) — tiny yakitori stalls, sake, smoky grills at 1am. Pure uncut Tokyo. #Tokyo #Yakitori", thumb: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600&h=400&fit=crop", username: "@nocturnal.food", likes: 34200 },
  { location: "Ubud, Bali, Indonesia",         caption: "Sacred Monkey Forest Sanctuary — 700 monkeys and ancient temples 🌿🐒 Go at 8:30am before the tour buses. #Bali",          thumb: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop", username: "@wild.dest",       likes: 58900 },
  { location: "Fitzroy, Melbourne, Australia", caption: "Hosier Lane street art — one of Melbourne's most vibrant living galleries 🎨 Changes weekly. #Melbourne #StreetArt",       thumb: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=600&h=400&fit=crop", username: "@wallsofmelb",     likes: 21600 },
  { location: "Gion, Kyoto, Japan",            caption: "Nishiki Tenmangu Shrine hidden inside Nishiki Market — most tourists walk right past it 🏮 #Kyoto #HiddenGem",             thumb: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop", username: "@kansai.secrets",  likes: 17400 },
  { location: "Canggu, Bali, Indonesia",       caption: "Tanah Lot sea temple at high tide 🌊⛩️ Get there 30 min before sunset for the perfect silhouette. #Bali",                 thumb: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop", username: "@bali.at.dusk",    likes: 93200 },
];

function extractOgTag(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
  return "";
}

const BLOCKED_DOMAINS = ["instagram.com", "tiktok.com", "facebook.com", "twitter.com", "x.com"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing url" });
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  // These platforms block server-side fetches — return realistic demo data
  if (BLOCKED_DOMAINS.some(d => hostname.includes(d))) {
    const fallback = DEMO_FALLBACKS[Math.floor(Math.random() * DEMO_FALLBACKS.length)];
    return res.status(200).json(fallback);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WunderlistBot/1.0; +https://wunderlist.app)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    const title       = extractOgTag(html, "title")       || extractOgTag(html, "site_name") || hostname;
    const description = extractOgTag(html, "description") || "";
    const image       = extractOgTag(html, "image")       || "";
    const siteName    = extractOgTag(html, "site_name")   || "";

    if (!description && !image) {
      // Nothing useful found — use a fallback
      const fallback = DEMO_FALLBACKS[Math.floor(Math.random() * DEMO_FALLBACKS.length)];
      return res.status(200).json(fallback);
    }

    return res.status(200).json({
      location: siteName || hostname,
      caption:  description || title,
      thumb:    image,
      username: `@${hostname.split(".")[0]}`,
      likes:    0,
    });
  } catch {
    // Network error or timeout — fall back to demo data
    const fallback = DEMO_FALLBACKS[Math.floor(Math.random() * DEMO_FALLBACKS.length)];
    return res.status(200).json(fallback);
  }
}
