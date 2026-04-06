import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   WUNDERLIST  —  Your travel inspiration, organised

   INSTAGRAM SHARE INTEGRATION (for production mobile build)
   ─────────────────────────────────────────────────────────
   iOS:  Add a Share Extension target (Swift) to the Expo/RN app.
         When user taps the send icon in Instagram → scrolls share sheet
         → taps Wunderlist. The iOS extension receives the public post URL
         via NSExtensionItem, deep-links into the main app:
           wunderlist://save?url=https://www.instagram.com/p/XXX
         Package: expo-share-intent (handles iOS + Android in one hook)

   Android: Add <intent-filter ACTION_SEND mimeType="text/plain"> to
            AndroidManifest.xml. Wunderlist appears in Android share sheet.
            Intent extras carry the post URL. Same expo-share-intent
            package handles this identically to iOS.

   Backend metadata pipeline:
     1. Receive URL: instagram.com/p/SHORTCODE
     2. Server-side fetch of public post page (no auth needed for public)
     3. Parse OpenGraph tags: og:description = caption, og:image = thumb,
        og:title = author info. Instagram embeds this in public HTML.
     4. Return { caption, thumb, location, username } to the app.
     For robust production use: Apify Instagram Post Scraper API or
     a self-hosted Puppeteer/Playwright microservice with rotating proxies.

   Web / PWA (this build): user pastes the URL → /api/parse-url
   extracts OpenGraph metadata server-side and classifies the post.
   Saves are persisted to localStorage so they survive page refreshes.
═══════════════════════════════════════════════════════════ */

const CATEGORIES = {
  food:       { label: "Food & Dining",      icon: "🍜", color: "#E07B54" },
  drinks:     { label: "Bars & Drinks",      icon: "🍸", color: "#9B7FD4" },
  sights:     { label: "Sights & Culture",   icon: "🏛️", color: "#5C9BE8" },
  nature:     { label: "Nature & Adventure", icon: "🌿", color: "#4CAF82" },
  nightlife:  { label: "Nightlife",          icon: "🌃", color: "#D45C8C" },
  experience: { label: "Experiences",        icon: "✨", color: "#E8C15C" },
  stay:       { label: "Where to Stay",      icon: "🏨", color: "#5CC4E8" },
};

function classify(caption = "") {
  const t = caption.toLowerCase();
  if (/ramen|sushi|restaurant|dining|eat|food|market|brunch|cafe|coffee|mochi|sashimi|meal|broth|pastry|bakery|taco|curry|bbq|izakaya|omakase|croissant|gelato|tapas|yakitori/.test(t)) return "food";
  if (/cocktail|bar|bintang|beachclub|wine|sake|beer|drink|brewery|pub|nightcap|rooftop bar/.test(t)) return "drinks";
  if (/temple|shrine|museum|gallery|teamlab|landmark|monument|cathedral|palace|castle|crossing|torii|heritage|historical|art/.test(t)) return "sights";
  if (/hike|reef|dive|scuba|rainforest|forest|bamboo|coastal walk|outdoor|nature|sunrise|mountain|terrace|rice field|crater|waterfall|canyon|desert|surf|beach/.test(t)) return "nature";
  if (/midnight|club|nightlife|rooftop|party|festival|night market/.test(t)) return "nightlife";
  if (/hotel|hostel|ryokan|resort|villa|airbnb|stay|lodge|guesthouse/.test(t)) return "stay";
  return "experience";
}

function extractDest(loc = "", caption = "") {
  const s = (loc + " " + caption).toLowerCase();
  const MAP = [
    [/tokyo|asakusa|shibuya|shinjuku|harajuku|akihabara|ginza|roppongi|yanaka|tsukiji|odaiba/,   "Tokyo",      "Japan",     "🇯🇵"],
    [/kyoto|arashiyama|gion|fushimi|nishiki|higashiyama/,                                         "Kyoto",      "Japan",     "🇯🇵"],
    [/osaka|dotonbori|namba|umeda|shinsekai/,                                                      "Osaka",      "Japan",     "🇯🇵"],
    [/sydney|bondi|manly|newtown|surry hills/,                                                     "Sydney",     "Australia", "🇦🇺"],
    [/melbourne|fitzroy|collingwood|st kilda|southbank/,                                           "Melbourne",  "Australia", "🇦🇺"],
    [/great barrier reef|cairns|port douglas/,                                                     "Cairns & GBR","Australia","🇦🇺"],
    [/uluru|alice springs|red centre/,                                                             "Uluru",      "Australia", "🇦🇺"],
    [/bali|ubud|seminyak|canggu|uluwatu|kuta|sanur/,                                               "Bali",       "Indonesia", "🇮🇩"],
    [/bangkok|chiang mai|phuket|ko samui/,                                                         "Thailand",   "Thailand",  "🇹🇭"],
    [/paris|eiffel|louvre|montmartre|marais/,                                                      "Paris",      "France",    "🇫🇷"],
    [/rome|colosseum|trastevere|vatican/,                                                          "Rome",       "Italy",     "🇮🇹"],
    [/florence|uffizi|ponte vecchio/,                                                              "Florence",   "Italy",     "🇮🇹"],
    [/new york|manhattan|brooklyn|lower east|soho/,                                                "New York",   "USA",       "🇺🇸"],
    [/london|shoreditch|brixton|covent/,                                                           "London",     "UK",        "🇬🇧"],
    [/barcelona|sagrada|gothic quarter/,                                                           "Barcelona",  "Spain",     "🇪🇸"],
  ];
  for (const [re, name, country, flag] of MAP) {
    if (re.test(s)) return { name, country, flag };
  }
  const parts = loc.split(",").map(p => p.trim()).filter(Boolean);
  return { name: parts[0] || "Unnamed", country: parts[1] || "", flag: "🌍" };
}

const COVERS = {
  "Tokyo":      "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=500&fit=crop",
  "Kyoto":      "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&h=500&fit=crop",
  "Osaka":      "https://images.unsplash.com/photo-1508009603885-50cf7c8dd0d5?w=800&h=500&fit=crop",
  "Sydney":     "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop",
  "Melbourne":  "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&h=500&fit=crop",
  "Bali":       "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=500&fit=crop",
  "Paris":      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=500&fit=crop",
  "Rome":       "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=500&fit=crop",
  "Barcelona":  "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=800&h=500&fit=crop",
  "New York":   "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=500&fit=crop",
};

const DEMO = [
  { id:1,  url:"https://www.instagram.com/p/abc001/", location:"Asakusa, Tokyo, Japan",        caption:"Sunrise at Senso-ji Temple — get there by 5:30am for pure silence 🙏 One of the most spiritual moments of my life. #Tokyo #Temple",                                                     thumb:"https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop", username:"@wanderlust.jp",     likes:88100, savedAt:"2025-01-15" },
  { id:2,  url:"https://www.instagram.com/p/abc002/", location:"Shibuya, Tokyo, Japan",         caption:"Ichiran Ramen — Hakata tonkotsu, 18-hour broth, solo booth 🍜 Order kaedama for extra noodles. Worth every minute in line. #Ramen #Tokyo",                                               thumb:"https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop", username:"@foodie_adventures",likes:42300, savedAt:"2025-01-17" },
  { id:3,  url:"https://www.instagram.com/p/abc003/", location:"Odaiba, Tokyo, Japan",          caption:"teamLab Borderless — infinite digital art rooms 🌊✨ Book 3 months ahead, this sells out instantly. #Tokyo #Art #teamLab",                                                                thumb:"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop", username:"@art.everywhere",  likes:31700, savedAt:"2025-01-20" },
  { id:4,  url:"https://www.instagram.com/p/abc004/", location:"Shinjuku, Tokyo, Japan",        caption:"Bar Benfiddich — bartender grows herbs and botanicals on the roof 🍸 Ask for a bespoke creation. Best cocktails in Tokyo. #Shinjuku",                                                     thumb:"https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop", username:"@nightcap.travels", likes:19400, savedAt:"2025-01-22" },
  { id:5,  url:"https://www.instagram.com/p/abc005/", location:"Tsukiji, Tokyo, Japan",         caption:"Tsukiji Outer Market 7am — fresh uni, tuna sashimi, best tamagoyaki 🐟🥚 Cash only. Get there before 8am before stalls sell out. #Tokyo",                                                thumb:"https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&h=400&fit=crop", username:"@marketdays",       likes:55600, savedAt:"2025-01-23" },
  { id:6,  url:"https://www.instagram.com/p/abc006/", location:"Shibuya, Tokyo, Japan",         caption:"Shibuya Crossing at midnight 🌃 Mag's Park rooftop for the aerial view — cocktail + chaos below. #Tokyo #Nightlife",                                                                     thumb:"https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600&h=400&fit=crop", username:"@citynights.asia",  likes:127800,savedAt:"2025-01-25" },
  { id:7,  url:"https://www.instagram.com/p/abc007/", location:"Yanaka, Tokyo, Japan",          caption:"Yanaka — old Tokyo that survived everything. Alleyways, vintage shops, cats everywhere 🐱 Zero tourists. #HiddenTokyo",                                                                   thumb:"https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&h=400&fit=crop", username:"@hiddenjapan",      likes:23400, savedAt:"2025-01-26" },
  { id:8,  url:"https://www.instagram.com/p/abc008/", location:"Arashiyama, Kyoto, Japan",      caption:"Bamboo Grove at 5am — zero crowds, pure filtered green light 🎋 Walk through to Okochi Sanso Garden after. #Kyoto #Bamboo",                                                             thumb:"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop", username:"@dawnchaser",       likes:203000,savedAt:"2025-02-01" },
  { id:9,  url:"https://www.instagram.com/p/abc009/", location:"Gion, Kyoto, Japan",            caption:"Geiko on Hanamikoji St at dusk 🏮 Don't photograph them — just absorb it. Walk the entire street on a Tuesday evening. #Kyoto",                                                         thumb:"https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop", username:"@culturetravels",  likes:76400, savedAt:"2025-02-02" },
  { id:10, url:"https://www.instagram.com/p/abc010/", location:"Fushimi Inari, Kyoto, Japan",   caption:"Full Fushimi Inari hike — 4hrs, zero tourists past the 2nd gate 🦊⛩️ Views from the top are stunning. Start at 6am. #Kyoto",                                                           thumb:"https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&h=400&fit=crop", username:"@trailblaze.asia",  likes:149000,savedAt:"2025-02-03" },
  { id:11, url:"https://www.instagram.com/p/abc011/", location:"Nishiki Market, Kyoto, Japan",  caption:"Nishiki Market — pickled everything, fresh yuba, skewered mochi 🥢 Go at 10am before tour groups. Cash mostly. #Kyoto #Food",                                                          thumb:"https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&h=400&fit=crop", username:"@streetfood.globe", likes:38900, savedAt:"2025-02-04" },
  { id:12, url:"https://www.instagram.com/p/abc012/", location:"Bondi Beach, Sydney, Australia",caption:"Bondi to Coogee coastal walk — 6km of dramatic coastline 🌊 Do it south to north for the best light. Free, no booking needed. #Sydney",                                                  thumb:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", username:"@coastalwanderer",  likes:94200, savedAt:"2025-02-10" },
  { id:13, url:"https://www.instagram.com/p/abc013/", location:"Great Barrier Reef, Australia", caption:"Liveaboard dive on the outer reef — 30m visibility, untouched coral 🐠🌊 Tusa Dive, Cairns. Book 3 months ahead. Non-divers can snorkel. #GBR",                                         thumb:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop", username:"@diveworldwide",    likes:67800, savedAt:"2025-02-11" },
  { id:14, url:"https://www.instagram.com/p/abc014/", location:"Fitzroy, Melbourne, Australia", caption:"Fitzroy brunch + Melbourne coffee ☕ Best coffee culture on earth. Try Proud Mary or Seven Seeds. Then Hammer & Tong for lunch. #Melbourne",                                            thumb:"https://images.unsplash.com/photo-1514395462725-fb4566210144?w=600&h=400&fit=crop", username:"@beanscene",        likes:28400, savedAt:"2025-02-12" },
  { id:15, url:"https://www.instagram.com/p/abc015/", location:"Ubud, Bali, Indonesia",         caption:"Tegallalang rice terraces at golden hour 🌾 Rent a scooter and take the back roads — the off-main-road views are 10x better. #Bali #Ubud",                                             thumb:"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop", username:"@ricepaddy.life",   likes:113000,savedAt:"2025-02-20" },
  { id:16, url:"https://www.instagram.com/p/abc016/", location:"Uluwatu, Bali, Indonesia",      caption:"Uluwatu cliff temple at sunset + Kecak fire dance 🔥 Buy dance tickets at the gate at 5pm. Don't bring valuables — monkeys steal everything. #Bali",                                    thumb:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop", username:"@soulofbali",       likes:87600, savedAt:"2025-02-21" },
  { id:17, url:"https://www.instagram.com/p/abc017/", location:"Seminyak, Bali, Indonesia",     caption:"Ku De Ta beachclub — Bali sunset + cold Bintang 🌅🍺 Get there at 5pm for a daybed before sunset. Fills up fast. #Bali #Sunset",                                                       thumb:"https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop", username:"@islandvibes.bali",  likes:59300, savedAt:"2025-02-22" },
  { id:18, url:"https://www.instagram.com/p/abc018/", location:"Canggu, Bali, Indonesia",       caption:"Old Man's Beach Canggu — beginner surf at dawn 🏄 Local instructors on the beach, $15 for 1.5hrs. Go 6-8am before the crowds arrive. #Bali #Surf",                                    thumb:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", username:"@surf.wander",      likes:44700, savedAt:"2025-02-23" },
];

function buildDests(posts) {
  const map = {};
  posts.forEach(p => {
    const d = extractDest(p.location, p.caption);
    const key = `${d.name}||${d.country}`;
    if (!map[key]) map[key] = { ...d, key, cover: COVERS[d.name] || p.thumb, items: [] };
    map[key].items.push({ ...p, category: classify(p.caption) });
  });
  return Object.values(map).sort((a, b) => b.items.length - a.items.length);
}

const parseDate   = str => str ? new Date(str + "T12:00:00") : null;
const daysBetween = (a, b) => a && b ? Math.round((b - a) / 86400000) : null;
const fmtDate     = d => d ? d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }) : "";
const addDays     = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

function loadFromStorage(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export default function App() {
  const [posts, setPosts]           = useState(() => loadFromStorage("wl_posts", []));
  const [dests, setDests]           = useState(() => buildDests(loadFromStorage("wl_posts", [])));
  const [screen, setScreen]         = useState("home");
  const [activeDest, setActiveDest] = useState(null);
  const [catFilter, setCatFilter]   = useState("all");
  const [starred, setStarred]       = useState(() => loadFromStorage("wl_starred", {}));
  const [tripModal, setTripModal]   = useState(false);
  const [trip, setTrip]             = useState({ origin:"", arrival:"", departure:"", travelers:"2", notes:"" });
  const [itinerary, setItinerary]   = useState(null);
  const [generating, setGenerating] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [pastedUrl, setPastedUrl]   = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [toast, setToast]           = useState(null);
  const [hoveredDest, setHoveredDest] = useState(null);
  const toastRef = useRef();

  // Persist saves and stars to localStorage
  useEffect(() => { try { localStorage.setItem("wl_posts", JSON.stringify(posts)); } catch {} }, [posts]);
  useEffect(() => { try { localStorage.setItem("wl_starred", JSON.stringify(starred)); } catch {} }, [starred]);

  const showToast = (msg, ok = true) => {
    clearTimeout(toastRef.current);
    setToast({ msg, ok });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  const addPost = useCallback((raw) => {
    const post = { ...raw, id: Date.now() + Math.random(), savedAt: new Date().toISOString().slice(0,10) };
    setPosts(prev => {
      const next = [post, ...prev];
      setDests(buildDests(next));
      return next;
    });
    const d = extractDest(post.location, post.caption);
    showToast(`✅ Saved to ${d.flag} ${d.name}`);
    setShareModal(false);
    setPastedUrl("");
  }, []);

  const handlePaste = async () => {
    if (!pastedUrl.trim()) return;
    setUrlLoading(true);
    try {
      const res  = await fetch("/api/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pastedUrl.trim() }),
      });
      const meta = await res.json();
      if (meta.error) throw new Error(meta.error);
      addPost({ url: pastedUrl.trim(), ...meta });
    } catch (err) {
      showToast("⚠️ Couldn't fetch that URL — try another link", false);
    }
    setUrlLoading(false);
  };

  const toggleStar = (dk, id) => setStarred(p => { const k=`${dk}::${id}`,n={...p}; n[k]?delete n[k]:(n[k]=true); return n; });
  const isStar     = (dk, id) => !!starred[`${dk}::${id}`];
  const starCount  = (dk) => Object.keys(starred).filter(k => k.startsWith(dk + "::")).length;

  const destObj  = dests.find(d => d.key === activeDest);
  const allItems = destObj?.items || [];
  const filtered = catFilter === "all" ? allItems : allItems.filter(i => i.category === catFilter);
  const groups   = Object.entries(CATEGORIES).map(([key, cfg]) => ({
    key, ...cfg, items: filtered.filter(i => i.category === key),
  })).filter(g => g.items.length > 0 && (catFilter === "all" || catFilter === g.key));

  const arrDate = parseDate(trip.arrival);
  const depDate = parseDate(trip.departure);
  const numDays = daysBetween(arrDate, depDate);

  const generateItinerary = async () => {
    setTripModal(false); setGenerating(true); setScreen("itinerary"); setItinerary(null);
    const pool = allItems.filter(i => isStar(destObj.key, i.id));
    const use  = pool.length > 0 ? pool : allItems;
    const cap  = Math.max(1, Math.min(numDays ?? 3, 10));
    const labels = Array.from({ length: cap }, (_, i) => arrDate ? fmtDate(addDays(arrDate, i)) : `Day ${i+1}`);

    const prompt = `You are an expert travel curator. Return ONLY valid JSON — absolutely no markdown, no explanation, nothing else whatsoever.

TRIP:
- Destination: ${destObj.name}, ${destObj.country}
- Flying from: ${trip.origin || "unspecified"}
- Arrival: ${arrDate ? fmtDate(arrDate) : "TBD"} | Departure: ${depDate ? fmtDate(depDate) : "TBD"}
- Days on ground: ${cap} (this is fixed — do not add or remove days)
- Day date labels: ${labels.map((l,i)=>`Day${i+1}="${l}"`).join(", ")}
- Travelers: ${trip.travelers}
- Notes: ${trip.notes || "none"}

INSTAGRAM SAVES:
${use.map(i => `[${i.category.toUpperCase()}] ${i.location}: ${i.caption.slice(0,160)}`).join("\n")}

RULES (strictly enforced):
1. Produce EXACTLY ${cap} day objects. No more. No less.
2. Day 1 (label "${labels[0]}"): Arrival day — maximum 2 slots, no early morning starts (start from afternoon), acknowledge jet lag.
3. Day ${cap} (label "${labels[cap-1]}"): Departure day — 1 slot maximum, morning only, wrap up tone.
4. Days 2 through ${cap-1}: Full days, 3–4 slots each. Group locations geographically. Mix categories across the day.
5. All tips must be specific: exact times, booking URLs/methods, prices where known, specific dishes or skip advice.
6. Maximise use of the saved places — distribute them across days.

Return this exact JSON structure (no other text):
{"destination":"${destObj.name}, ${destObj.country}","tagline":"evocative one-liner for this trip","summary":"2 sentences specific to this ${cap}-day trip","tips":["practical tip 1","practical tip 2","practical tip 3"],"days":[{"day":1,"label":"${labels[0]}","theme":"short theme","area":"main area","slots":[{"time":"Afternoon","icon":"🏙️","place":"exact name","area":"district","category":"experience","tip":"specific actionable tip","est":"~X hrs"}]}]}`;

    try {
      const res  = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const txt  = data.content.map(c => c.text||"").join("");
      setItinerary(JSON.parse(txt.replace(/```json|```/g,"").trim()));
    } catch {
      setItinerary({
        destination:`${destObj.name}, ${destObj.country}`, tagline:"Every great journey starts with a single save.",
        summary:`${cap} days in ${destObj.name} curated from your Instagram saves.`,
        tips:["Book headline spots 2–4 weeks in advance","Arrive early everywhere to beat crowds","Keep cash for markets and street food"],
        days: Array.from({length:cap}, (_,i) => ({
          day:i+1, label:labels[i],
          theme: i===0?"Arrival & First Impressions":i===cap-1?"Final Morning":["Explore the Old Town","Markets & Hidden Gems","Art, Food & Nightlife","Nature & Views"][i%4],
          area:destObj.name,
          slots: i===0
            ? [{time:"Afternoon",icon:"🏙️",place:"Neighbourhood orientation walk",area:destObj.name,category:"experience",tip:"Drop your bags and walk 10 minutes in any direction. No agenda — just absorb the city.",est:"~2 hrs"},{time:"Evening",icon:"🌆",place:"Dinner at a local restaurant",area:destObj.name,category:"food",tip:"Easy first evening. Book 24hrs ahead — you'll be tired from travel.",est:"~2 hrs"}]
            : i===cap-1
            ? [{time:"Morning",icon:"🌅",place:"Final breakfast & last wander",area:destObj.name,category:"food",tip:"Pack before heading out. Store luggage at your hotel until transfer time.",est:"~1.5 hrs"}]
            : use.slice(i*3,i*3+3).map((item,si)=>({time:["Morning","Afternoon","Evening"][si],icon:["☀️","🌤️","🌆"][si],place:item.location.split(",")[0],area:destObj.name,category:item.category,tip:item.caption.slice(0,130),est:"~2 hrs"})),
        })),
      });
    }
    setGenerating(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070F",color:"#EAE6DC",fontFamily:"'DM Sans','Trebuchet MS',sans-serif",overflowX:"hidden",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#222232;border-radius:99px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes toastSlide{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .dc{transition:transform .25s,border-color .25s,box-shadow .25s;cursor:pointer}
        .dc:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.5)}
        .gold{background:linear-gradient(135deg,#C9A96E,#8A6A38);border:none;color:#07070F;font-weight:700;letter-spacing:.08em;cursor:pointer;text-transform:uppercase;transition:opacity .2s}
        .gold:hover{opacity:.88}
        .ghost{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#8A8070;cursor:pointer;transition:all .2s}
        .ghost:hover{background:rgba(255,255,255,.09);border-color:rgba(201,169,110,.3);color:#C9A96E}
        .ic{transition:border-color .2s,background .2s}
        input,textarea,select{font-family:'DM Sans',sans-serif;color-scheme:dark}
      `}</style>

      {/* ambient bg */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:"radial-gradient(ellipse 80% 55% at 12% 5%,#1C152E 0%,transparent 55%),radial-gradient(ellipse 60% 45% at 88% 88%,#0C1E30 0%,transparent 55%)"}}/>

      {/* TOAST */}
      {toast&&<div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:toast.ok?"rgba(76,175,130,.14)":"rgba(224,123,84,.14)",border:`1px solid ${toast.ok?"rgba(76,175,130,.45)":"rgba(224,123,84,.45)"}`,borderRadius:99,padding:"12px 26px",fontSize:13,color:toast.ok?"#4CAF82":"#E07B54",backdropFilter:"blur(20px)",animation:"toastSlide .3s ease",whiteSpace:"nowrap"}}>{toast.msg}</div>}

      {/* SHARE MODAL */}
      {shareModal&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={()=>setShareModal(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.84)",backdropFilter:"blur(18px)"}}/>
          <div style={{position:"relative",background:"#10101E",border:"1px solid rgba(255,255,255,.1)",borderRadius:28,padding:"34px 30px",maxWidth:460,width:"100%",boxShadow:"0 40px 80px rgba(0,0,0,.6)",animation:"fadeUp .3s ease"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,marginBottom:6}}>Save from Instagram</div>
            <p style={{color:"#5A5448",fontSize:13,marginBottom:24,lineHeight:1.65}}>Share any travel post directly to Wunderlist — it auto-sorts into the right destination bucket.</p>

            {/* Native share steps */}
            <div style={{background:"rgba(201,169,110,.07)",border:"1px solid rgba(201,169,110,.15)",borderRadius:16,padding:"18px 20px",marginBottom:24}}>
              <div style={{fontSize:10,letterSpacing:".22em",textTransform:"uppercase",color:"#C9A96E",marginBottom:14}}>📱 On iOS or Android</div>
              {[["1","Open any travel post, reel, or story in Instagram"],["2","Tap the paper plane icon (bottom right of post)"],["3","Scroll the share sheet — tap Wunderlist"],["4","The post is instantly sorted into the right destination"]].map(([n,t])=>(
                <div key={n} style={{display:"flex",gap:12,marginBottom:9,alignItems:"flex-start"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(201,169,110,.18)",border:"1px solid rgba(201,169,110,.4)",fontSize:11,color:"#C9A96E",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:700,marginTop:1}}>{n}</div>
                  <div style={{fontSize:13,color:"#8A8070",lineHeight:1.55}}>{t}</div>
                </div>
              ))}
              <div style={{marginTop:12,padding:"10px 14px",background:"rgba(255,255,255,.04)",borderRadius:10,fontSize:11,color:"#4A4440",lineHeight:1.65}}>
                Wunderlist appears natively in the iOS & Android share sheet — the same way you'd share to WhatsApp or Notes. No copy-pasting required on mobile.
              </div>
            </div>

            {/* Web paste fallback */}
            <div style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"#4A4440",marginBottom:10}}>Or paste a link (web)</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input value={pastedUrl} onChange={e=>setPastedUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handlePaste()} placeholder="https://www.instagram.com/p/…"
                style={{flex:1,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#EAE6DC",fontSize:14,outline:"none"}}/>
              <button onClick={handlePaste} disabled={!pastedUrl.trim()||urlLoading} className="gold" style={{padding:"12px 18px",fontSize:13,borderRadius:12,opacity:pastedUrl.trim()&&!urlLoading?1:.35}}>
                {urlLoading?"…":"Save"}
              </button>
            </div>
            <button onClick={()=>setShareModal(false)} className="ghost" style={{width:"100%",padding:"12px",fontSize:13,borderRadius:12,fontFamily:"'DM Sans',sans-serif"}}>Close</button>
          </div>
        </div>
      )}

      {/* TRIP MODAL */}
      {tripModal&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={()=>setTripModal(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.84)",backdropFilter:"blur(18px)"}}/>
          <div style={{position:"relative",background:"#10101E",border:"1px solid rgba(255,255,255,.1)",borderRadius:28,padding:"34px 30px",maxWidth:460,width:"100%",boxShadow:"0 40px 80px rgba(0,0,0,.6)",animation:"fadeUp .3s ease",maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:13,color:"#C9A96E",letterSpacing:".2em",textTransform:"uppercase",marginBottom:5}}>Trip Details</div>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:300,marginBottom:6}}>Plan {destObj?.name}</h2>
            <p style={{color:"#5A5448",fontSize:13,marginBottom:26,lineHeight:1.65}}>Your exact dates let Wunderlist build an itinerary calibrated to your actual days on the ground — including arrival and departure logistics.</p>

            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {[["Flying from","origin","text","e.g. Chicago (ORD)"],["Arrival date","arrival","date",""],["Departure date","departure","date",""]].map(([lbl,key,type,ph])=>(
                <div key={key}>
                  <label style={{fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"#5A5448",display:"block",marginBottom:7}}>{lbl}</label>
                  <input type={type} value={trip[key]} placeholder={ph} onChange={e=>setTrip(p=>({...p,[key]:e.target.value}))}
                    style={{width:"100%",padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#EAE6DC",fontSize:15,outline:"none"}}/>
                </div>
              ))}

              {numDays!==null&&numDays>0&&(
                <div style={{background:"rgba(201,169,110,.1)",border:"1px solid rgba(201,169,110,.25)",borderRadius:12,padding:"11px 16px",fontSize:14,color:"#C9A96E",textAlign:"center",fontWeight:500}}>
                  {numDays} {numDays===1?"day":"days"} on the ground · {arrDate&&fmtDate(arrDate)} → {depDate&&fmtDate(depDate)}
                </div>
              )}

              <div>
                <label style={{fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"#5A5448",display:"block",marginBottom:7}}>Travelers</label>
                <div style={{display:"flex",gap:8}}>
                  {["1","2","3","4","5+"].map(n=>(
                    <button key={n} onClick={()=>setTrip(p=>({...p,travelers:n}))} style={{flex:1,padding:"10px 4px",borderRadius:10,border:`1px solid ${trip.travelers===n?"#C9A96E":"rgba(255,255,255,.08)"}`,background:trip.travelers===n?"rgba(201,169,110,.15)":"transparent",color:trip.travelers===n?"#C9A96E":"#5A5448",fontSize:14,cursor:"pointer",transition:"all .2s"}}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:"#5A5448",display:"block",marginBottom:7}}>Notes (optional)</label>
                <textarea value={trip.notes} onChange={e=>setTrip(p=>({...p,notes:e.target.value}))} placeholder="e.g. vegetarian, slow pace, avoid touristy traps, budget conscious…" rows={3}
                  style={{width:"100%",padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#EAE6DC",fontSize:13,outline:"none",resize:"vertical",lineHeight:1.55}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:24}}>
              <button onClick={()=>setTripModal(false)} className="ghost" style={{flex:1,padding:"14px",fontSize:12,borderRadius:14,fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
              <button onClick={generateItinerary} className="gold" style={{flex:2,padding:"14px",fontSize:13,borderRadius:14,fontFamily:"'DM Sans',sans-serif"}}>Generate Itinerary ✨</button>
            </div>
          </div>
        </div>
      )}

      <div style={{position:"relative",zIndex:1}}>

        {/* ═══ HOME ═══ */}
        {screen==="home"&&(
          <div>
            <nav style={{padding:"18px 28px",borderBottom:"1px solid rgba(255,255,255,.05)",background:"rgba(7,7,15,.92)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:300,background:"linear-gradient(135deg,#EAE6DC,#C9A96E)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>wunderlist</span>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#3A3530"}}>{posts.length} saves · {dests.length} destinations</span>
                {posts.length > 0 && (
                  <button onClick={()=>{ if(window.confirm("Clear all saves? This can't be undone.")) { setPosts([]); setDests([]); setStarred({}); }}} className="ghost" style={{padding:"8px 14px",fontSize:11,borderRadius:9,fontFamily:"'DM Sans',sans-serif"}}>Clear</button>
                )}
                <button onClick={()=>setShareModal(true)} className="gold" style={{padding:"10px 20px",fontSize:12,borderRadius:11,fontFamily:"'DM Sans',sans-serif"}}>+ Save a Post</button>
              </div>
            </nav>

            <div style={{maxWidth:1100,margin:"0 auto",padding:"44px 28px"}}>
              <div style={{marginBottom:44,animation:"fadeUp .5s ease"}}>
                <div style={{fontSize:11,letterSpacing:".32em",textTransform:"uppercase",color:"#C9A96E",marginBottom:10}}>Your travel collection</div>
                <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(38px,6vw,62px)",fontWeight:300,letterSpacing:"-.02em",lineHeight:1,marginBottom:12}}>Destination Buckets</h1>
                <p style={{color:"#4A4440",fontSize:15,lineHeight:1.75,maxWidth:500}}>Every Instagram post you share to Wunderlist is automatically sorted by destination — ready to star, explore, and plan from.</p>
              </div>

              {/* Share CTA banner */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,flexWrap:"wrap",background:"rgba(201,169,110,.06)",border:"1px dashed rgba(201,169,110,.22)",borderRadius:20,padding:"20px 24px",marginBottom:40}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div style={{fontSize:30}}>📲</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:"#C9A96E",marginBottom:3}}>Share any Instagram travel post directly to Wunderlist</div>
                    <div style={{fontSize:12,color:"#4A4440"}}>Tap the send icon in Instagram → Wunderlist — it auto-drops into the right bucket</div>
                  </div>
                </div>
                <button onClick={()=>setShareModal(true)} className="ghost" style={{padding:"10px 20px",fontSize:12,borderRadius:11,fontFamily:"'DM Sans',sans-serif",color:"#C9A96E",borderColor:"rgba(201,169,110,.3)",whiteSpace:"nowrap"}}>How it works →</button>
              </div>

              {dests.length === 0 && (
                <div style={{textAlign:"center",padding:"80px 20px",animation:"fadeUp .5s ease"}}>
                  <div style={{fontSize:52,marginBottom:20}}>🗺️</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:300,marginBottom:10}}>No saves yet</div>
                  <p style={{color:"#4A4440",fontSize:14,lineHeight:1.75,maxWidth:380,margin:"0 auto 28px"}}>
                    Paste an Instagram post link above to start building your travel collection — or load some sample destinations to explore how it works.
                  </p>
                  <button onClick={()=>{ setPosts(DEMO); setDests(buildDests(DEMO)); }} className="ghost" style={{padding:"12px 28px",fontSize:13,borderRadius:14,fontFamily:"'DM Sans',sans-serif",color:"#C9A96E",borderColor:"rgba(201,169,110,.3)"}}>
                    Load sample destinations →
                  </button>
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:20}}>
                {dests.map((dest, idx) => {
                  const cats={}; dest.items.forEach(i=>{cats[i.category]=(cats[i.category]||0)+1;});
                  const top=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,4);
                  const sc=starCount(dest.key);
                  return (
                    <div key={dest.key} className="dc"
                      onClick={()=>{setActiveDest(dest.key);setCatFilter("all");setScreen("detail");}}
                      onMouseEnter={()=>setHoveredDest(dest.key)} onMouseLeave={()=>setHoveredDest(null)}
                      style={{borderRadius:24,overflow:"hidden",border:`1px solid ${hoveredDest===dest.key?"rgba(201,169,110,.25)":"rgba(255,255,255,.07)"}`,animation:`fadeUp .4s ${idx*.06}s both`}}>
                      <div style={{position:"relative",paddingTop:"55%",overflow:"hidden"}}>
                        <img src={dest.cover} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transition:"transform .4s",transform:hoveredDest===dest.key?"scale(1.06)":"scale(1)"}}/>
                        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,7,15,.95) 0%,rgba(7,7,15,.15) 60%,transparent 100%)"}}/>
                        <div style={{position:"absolute",top:14,right:14,display:"flex",gap:7}}>
                          <div style={{background:"rgba(7,7,15,.7)",backdropFilter:"blur(8px)",borderRadius:99,padding:"4px 11px",fontSize:10,color:"#C9A96E"}}>{dest.items.length} saves</div>
                          {sc>0&&<div style={{background:"#C9A96E",borderRadius:99,padding:"4px 10px",fontSize:10,color:"#07070F",fontWeight:700}}>★ {sc}</div>}
                        </div>
                        <div style={{position:"absolute",bottom:0,padding:"16px 20px"}}>
                          <div style={{fontSize:10,color:"#C9A96E",letterSpacing:".15em",textTransform:"uppercase",marginBottom:4}}>{dest.country}</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:300}}>{dest.flag} {dest.name}</div>
                        </div>
                      </div>
                      <div style={{padding:"14px 18px",background:"rgba(255,255,255,.025)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {top.map(([cat,count])=>(
                            <div key={cat} style={{padding:"4px 10px",borderRadius:99,background:`${CATEGORIES[cat]?.color}18`,border:`1px solid ${CATEGORIES[cat]?.color}44`,fontSize:10,color:CATEGORIES[cat]?.color}}>
                              {CATEGORIES[cat]?.icon} {count}
                            </div>
                          ))}
                        </div>
                        <span style={{color:"#3A3530",fontSize:18,flexShrink:0}}>→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ DETAIL ═══ */}
        {screen==="detail"&&destObj&&(
          <div>
            <div style={{position:"relative",height:300,overflow:"hidden"}}>
              <img src={destObj.cover} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,#07070F 0%,rgba(7,7,15,.45) 55%,transparent 100%)"}}/>
              <button onClick={()=>setScreen("home")} style={{position:"absolute",top:20,left:24,background:"rgba(7,7,15,.65)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:99,padding:"8px 18px",color:"#EAE6DC",fontSize:11,cursor:"pointer",letterSpacing:".08em",textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>← Destinations</button>
              <button onClick={()=>setShareModal(true)} style={{position:"absolute",top:20,right:24,background:"rgba(201,169,110,.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(201,169,110,.3)",borderRadius:99,padding:"8px 18px",color:"#C9A96E",fontSize:11,cursor:"pointer",letterSpacing:".08em",textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>+ Add Post</button>
              <div style={{position:"absolute",bottom:0,padding:"24px 32px"}}>
                <div style={{fontSize:10,letterSpacing:".3em",textTransform:"uppercase",color:"#C9A96E",marginBottom:6}}>{destObj.country} · {destObj.items.length} saves</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(32px,5vw,52px)",fontWeight:300,letterSpacing:"-.02em"}}>{destObj.flag} {destObj.name}</div>
              </div>
            </div>

            <div style={{background:"rgba(7,7,15,.96)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,.05)",position:"sticky",top:0,zIndex:10,padding:"14px 24px"}}>
              <div style={{maxWidth:1000,margin:"0 auto",display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {[{key:"all",label:"All",icon:"🗺️",color:"#C9A96E"},...Object.entries(CATEGORIES).map(([k,v])=>({key:k,...v}))].map(cat=>(
                    <button key={cat.key} onClick={()=>setCatFilter(cat.key)} style={{padding:"7px 14px",borderRadius:99,border:`1px solid ${catFilter===cat.key?cat.color:"rgba(255,255,255,.08)"}`,background:catFilter===cat.key?`${cat.color}18`:"transparent",color:catFilter===cat.key?cat.color:"#5A5448",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:".04em",transition:"all .2s"}}>
                      {cat.icon} {cat.label||"All"}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setTripModal(true)} className="gold" style={{padding:"11px 22px",fontSize:12,borderRadius:12,whiteSpace:"nowrap",flexShrink:0,fontFamily:"'DM Sans',sans-serif"}}>
                  ✈️ Plan My Trip {starCount(destObj.key)>0?`(${starCount(destObj.key)} ★)`:""}
                </button>
              </div>
            </div>

            {starCount(destObj.key)===0&&(
              <div style={{maxWidth:1000,margin:"20px auto 0",padding:"0 24px"}}>
                <div style={{background:"rgba(255,255,255,.025)",border:"1px dashed rgba(255,255,255,.08)",borderRadius:14,padding:"13px 18px",fontSize:13,color:"#3A3530",textAlign:"center"}}>
                  ☆ Star the places you want included — then hit Plan My Trip for a tailored itinerary
                </div>
              </div>
            )}

            <div style={{maxWidth:1000,margin:"0 auto",padding:"24px"}}>
              {groups.map(group=>(
                <div key={group.key} style={{marginBottom:36}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                    <span style={{fontSize:18}}>{group.icon}</span>
                    <span style={{fontSize:12,letterSpacing:".18em",textTransform:"uppercase",color:group.color}}>{group.label}</span>
                    <div style={{flex:1,height:"1px",background:`${group.color}18`,marginLeft:8}}/>
                    <span style={{fontSize:11,color:"#2A2A30"}}>{group.items.length}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
                    {group.items.map(item=>{
                      const st=isStar(destObj.key,item.id);
                      return (
                        <div key={item.id} className="ic" style={{borderRadius:18,overflow:"hidden",border:`1px solid ${st?group.color+"44":"rgba(255,255,255,.06)"}`,background:st?`${group.color}07`:"rgba(255,255,255,.025)"}}>
                          <div style={{position:"relative",paddingTop:"60%"}}>
                            <img src={item.thumb} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,7,15,.88) 0%,transparent 55%)"}}/>
                            <div style={{position:"absolute",top:9,left:10,background:"rgba(7,7,15,.6)",backdropFilter:"blur(6px)",borderRadius:99,padding:"2px 9px",fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:"#C9A96E"}}>{item.type||"post"}</div>
                            <button onClick={()=>toggleStar(destObj.key,item.id)} style={{position:"absolute",top:8,right:8,width:32,height:32,borderRadius:"50%",background:st?group.color:"rgba(7,7,15,.6)",border:"none",cursor:"pointer",fontSize:14,backdropFilter:"blur(6px)",transition:"all .2s",transform:st?"scale(1.12)":"scale(1)",color:st?"#07070F":"#EAE6DC"}}>
                              {st?"★":"☆"}
                            </button>
                            <div style={{position:"absolute",bottom:9,left:12,right:48,fontSize:12,fontWeight:500,lineHeight:1.3}}>{item.location.split(",")[0]}</div>
                          </div>
                          <div style={{padding:"11px 13px"}}>
                            <div style={{fontSize:11,color:"#5A5050",lineHeight:1.6}}>{item.caption.slice(0,95)}{item.caption.length>95?"…":""}</div>
                            <div style={{fontSize:10,color:"#2A2A30",marginTop:7,display:"flex",justifyContent:"space-between"}}>
                              <span>{item.username}</span>
                              {item.likes>0&&<span>{(item.likes/1000).toFixed(1)}k ♥</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ITINERARY ═══ */}
        {screen==="itinerary"&&(
          <div style={{maxWidth:780,margin:"0 auto",padding:"36px 24px 100px"}}>
            <button onClick={()=>{setScreen("detail");setItinerary(null);}} style={{background:"none",border:"none",color:"#4A4440",fontSize:12,cursor:"pointer",letterSpacing:".1em",textTransform:"uppercase",marginBottom:36,padding:0}}>← Back to {destObj?.name}</button>

            {generating&&(
              <div style={{textAlign:"center",padding:"100px 0"}}>
                <div style={{fontSize:44,marginBottom:24,animation:"float 2s ease-in-out infinite"}}>✈️</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:28,marginBottom:10}}>Crafting your itinerary…</div>
                <div style={{color:"#4A4440",fontSize:14}}>Building {numDays??3} days for {destObj?.name}</div>
              </div>
            )}

            {!generating&&itinerary&&(
              <div style={{animation:"fadeUp .5s ease"}}>
                <div style={{marginBottom:40}}>
                  <div style={{fontSize:10,letterSpacing:".3em",textTransform:"uppercase",color:"#C9A96E",marginBottom:10}}>
                    ✈️ {trip.origin&&`${trip.origin} → `}{itinerary.destination}
                    {numDays?` · ${numDays} ${numDays===1?"day":"days"}`:""}
                    {trip.arrival&&trip.departure&&` · ${trip.arrival} – ${trip.departure}`}
                  </div>
                  <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(34px,6vw,56px)",fontWeight:300,lineHeight:1,letterSpacing:"-.02em",marginBottom:14}}>{itinerary.destination}</h1>
                  <p style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:20,color:"#7A7060",lineHeight:1.65,marginBottom:12}}>{itinerary.tagline}</p>
                  <p style={{color:"#4A4440",fontSize:14,lineHeight:1.75,maxWidth:600}}>{itinerary.summary}</p>
                </div>

                {itinerary.tips?.length>0&&(
                  <div style={{background:"rgba(201,169,110,.07)",border:"1px solid rgba(201,169,110,.2)",borderRadius:18,padding:"20px 24px",marginBottom:40}}>
                    <div style={{fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"#C9A96E",marginBottom:14}}>📋 Before You Go</div>
                    {itinerary.tips.map((t,i)=>(
                      <div key={i} style={{display:"flex",gap:12,marginBottom:i<itinerary.tips.length-1?10:0}}>
                        <span style={{color:"#C9A96E",flexShrink:0}}>→</span>
                        <span style={{fontSize:13,color:"#7A7060",lineHeight:1.6}}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:40}}>
                  {itinerary.days.map(day=>(
                    <div key={day.day}>
                      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18}}>
                        <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#C9A96E,#8A6A38)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#07070F",flexShrink:0}}>
                          <span style={{fontSize:14,fontWeight:700,lineHeight:1}}>{day.day}</span>
                        </div>
                        <div>
                          <div style={{fontSize:10,letterSpacing:".2em",textTransform:"uppercase",color:"#C9A96E"}}>{day.label}{day.area?` · ${day.area}`:""}</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,marginTop:2}}>{day.theme}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:10,paddingLeft:62}}>
                        {day.slots.map((slot,i)=>{
                          const cat=CATEGORIES[slot.category]||CATEGORIES.experience;
                          return (
                            <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start",padding:"16px 20px",background:"rgba(255,255,255,.025)",borderLeft:`3px solid ${cat.color}`,border:`1px solid ${cat.color}18`,borderRadius:"0 16px 16px 0",borderLeftColor:cat.color}}>
                              <div style={{fontSize:22,flexShrink:0,lineHeight:1,marginTop:2}}>{slot.icon}</div>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                                  <span style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:cat.color}}>{slot.time}</span>
                                  <span style={{fontSize:10,color:"#1A1A20"}}>·</span>
                                  <span style={{fontSize:10,color:"#3A3440"}}>{cat.icon} {cat.label}</span>
                                  {slot.area&&<><span style={{fontSize:10,color:"#1A1A20"}}>·</span><span style={{fontSize:10,color:"#3A3440"}}>📍 {slot.area}</span></>}
                                  {slot.est&&<><span style={{fontSize:10,color:"#1A1A20"}}>·</span><span style={{fontSize:10,color:"#3A3440"}}>⏱ {slot.est}</span></>}
                                </div>
                                <div style={{fontSize:16,fontWeight:500,marginBottom:6,lineHeight:1.3}}>{slot.place}</div>
                                <div style={{fontSize:12,color:"#4A4448",lineHeight:1.65,fontStyle:"italic"}}>💡 {slot.tip}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:52,padding:"28px",background:"rgba(201,169,110,.05)",border:"1px solid rgba(201,169,110,.14)",borderRadius:22,textAlign:"center"}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,marginBottom:10}}>🧳</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:18,color:"#C9A96E",marginBottom:6}}>{destObj?.name} awaits.</div>
                  <div style={{fontSize:12,color:"#3A3438",marginBottom:22}}>
                    {itinerary.days.length} days · {itinerary.days.reduce((a,d)=>a+d.slots.length,0)} experiences{starCount(destObj?.key)>0?` · ${starCount(destObj.key)} starred places`:""}
                  </div>
                  <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                    <button onClick={()=>setTripModal(true)} className="ghost" style={{padding:"10px 22px",fontSize:12,borderRadius:12,fontFamily:"'DM Sans',sans-serif",color:"#C9A96E",borderColor:"rgba(201,169,110,.3)"}}>✏️ Edit & Regenerate</button>
                    <button onClick={()=>setScreen("detail")} className="ghost" style={{padding:"10px 22px",fontSize:12,borderRadius:12,fontFamily:"'DM Sans',sans-serif"}}>← Back to Places</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
