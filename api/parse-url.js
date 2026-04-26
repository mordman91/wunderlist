// Extracts metadata from a URL for saving travel inspiration posts.
// Platform-specific handlers for Instagram, TikTok, and Twitter/X.
// Falls back to OpenGraph tag scraping for all other URLs.

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

async function tryInstagram(url) {
  const match = url.match(/instagram\.com\/(?:p|reel|tv|reels)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const shortcode = match[1];

  // Try the public oEmbed endpoint (works for some public posts without auth)
  try {
    const oembed = await fetch(
      `https://www.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/&format=json`,
      {
        headers: { "User-Agent": "Twitterbot/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (oembed.ok) {
      const data = await oembed.json();
      if (data.title) {
        return {
          location: "",
          caption: data.title,
          thumb: data.thumbnail_url || "",
          username: `@${data.author_name || "instagram"}`,
          likes: 0,
        };
      }
    }
  } catch {}

  // Try the embed page — designed for iframes, sometimes less restricted
  try {
    const embed = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (embed.ok) {
      const html = await embed.text();
      const caption = extractOgTag(html, "description");
      const image   = extractOgTag(html, "image");
      if (caption || image) {
        return { location: "", caption: caption || "", thumb: image || "", username: "@instagram", likes: 0 };
      }
    }
  } catch {}

  return null;
}

async function tryTikTok(url) {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.title) return null;
    return {
      location: "",
      caption: data.title,
      thumb: data.thumbnail_url || "",
      username: `@${data.author_name || "tiktok"}`,
      likes: 0,
    };
  } catch {
    return null;
  }
}

async function tryTwitter(url) {
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const textMatch = data.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const caption = textMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "";
    return {
      location: "",
      caption,
      thumb: "",
      username: `@${data.author_name || "twitter"}`,
      likes: 0,
    };
  } catch {
    return null;
  }
}

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

  // Platform-specific handlers
  if (hostname.includes("instagram.com")) {
    const result = await tryInstagram(url);
    if (result) return res.status(200).json(result);
    return res.status(200).json({ requiresManualEntry: true, platform: "Instagram" });
  }

  if (hostname.includes("tiktok.com")) {
    const result = await tryTikTok(url);
    if (result) return res.status(200).json(result);
    return res.status(200).json({ requiresManualEntry: true, platform: "TikTok" });
  }

  if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
    const result = await tryTwitter(url);
    if (result) return res.status(200).json(result);
    return res.status(200).json({ requiresManualEntry: true, platform: "X / Twitter" });
  }

  // General OpenGraph scraping for all other URLs
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WunderlistBot/1.0; +https://wunderlist.app)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html        = await response.text();
    const title       = extractOgTag(html, "title")       || extractOgTag(html, "site_name") || hostname;
    const description = extractOgTag(html, "description") || "";
    const image       = extractOgTag(html, "image")       || "";
    const siteName    = extractOgTag(html, "site_name")   || "";

    if (!description && !image) {
      return res.status(200).json({ requiresManualEntry: true, platform: siteName || hostname });
    }

    return res.status(200).json({
      location: siteName || hostname,
      caption:  description || title,
      thumb:    image,
      username: `@${hostname.split(".")[0]}`,
      likes:    0,
    });
  } catch {
    return res.status(200).json({ requiresManualEntry: true, platform: hostname });
  }
}
