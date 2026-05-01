// Extracts metadata from a URL for saving travel inspiration posts.
// Instagram: uses the official Meta oEmbed API (requires INSTAGRAM_APP_TOKEN env var).
// TikTok: public oEmbed, no auth needed.
// Everything else: OpenGraph tag scraping.

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

// Official Meta oEmbed — returns real caption, author, and thumbnail for public posts.
// Token format: "APP_ID|APP_SECRET" from your Meta developer app.
// Docs: https://developers.facebook.com/docs/instagram/oembed
async function tryInstagramOEmbed(url) {
  const token = process.env.INSTAGRAM_APP_TOKEN;
  if (!token) return null;

  try {
    const endpoint = `https://graph.facebook.com/v22.0/instagram_oembed?url=${encodeURIComponent(url)}&fields=title,author_name,thumbnail_url&access_token=${token}`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.title) return null;
    return {
      location: "",
      caption:  data.title,
      thumb:    data.thumbnail_url || "",
      username: `@${data.author_name || "instagram"}`,
      likes:    0,
    };
  } catch {
    return null;
  }
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
      caption:  data.title,
      thumb:    data.thumbnail_url || "",
      username: `@${data.author_name || "tiktok"}`,
      likes:    0,
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
      thumb:    "",
      username: `@${data.author_name || "twitter"}`,
      likes:    0,
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

  if (hostname.includes("instagram.com") || hostname.includes("facebook.com")) {
    const result = await tryInstagramOEmbed(url);
    if (result) return res.status(200).json(result);
    // No token set or post is private — ask for location only
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
