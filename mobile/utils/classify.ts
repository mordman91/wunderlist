import { CATEGORIES, COVERS } from "@/constants";

export type Category = keyof typeof CATEGORIES;

export interface Post {
  id: number;
  url: string;
  location: string;
  caption: string;
  thumb: string;
  username: string;
  likes: number;
  savedAt: string;
  category: Category;
}

export interface Destination {
  key: string;
  name: string;
  country: string;
  flag: string;
  cover: string;
  items: Post[];
}

export function classify(caption: string): Category {
  const t = caption.toLowerCase();
  if (/ramen|sushi|restaurant|dining|eat|food|market|brunch|cafe|coffee|mochi|sashimi|meal|broth|pastry|bakery|taco|curry|bbq|izakaya|omakase|croissant|gelato|tapas|yakitori/.test(t)) return "food";
  if (/cocktail|bar|bintang|beachclub|wine|sake|beer|drink|brewery|pub|nightcap|rooftop bar/.test(t)) return "drinks";
  if (/temple|shrine|museum|gallery|teamlab|landmark|monument|cathedral|palace|castle|crossing|torii|heritage|historical|art/.test(t)) return "sights";
  if (/hike|reef|dive|scuba|rainforest|forest|bamboo|coastal walk|outdoor|nature|sunrise|mountain|terrace|rice field|crater|waterfall|canyon|desert|surf|beach/.test(t)) return "nature";
  if (/midnight|club|nightlife|rooftop|party|festival|night market/.test(t)) return "nightlife";
  if (/hotel|hostel|ryokan|resort|villa|airbnb|stay|lodge|guesthouse/.test(t)) return "stay";
  return "experience";
}

const DEST_MAP: [RegExp, string, string, string][] = [
  [/tokyo|asakusa|shibuya|shinjuku|harajuku|akihabara|ginza|roppongi|yanaka|tsukiji|odaiba/, "Tokyo",      "Japan",     "🇯🇵"],
  [/kyoto|arashiyama|gion|fushimi|nishiki|higashiyama/,                                       "Kyoto",      "Japan",     "🇯🇵"],
  [/osaka|dotonbori|namba|umeda|shinsekai/,                                                    "Osaka",      "Japan",     "🇯🇵"],
  [/sydney|bondi|manly|newtown|surry hills/,                                                   "Sydney",     "Australia", "🇦🇺"],
  [/melbourne|fitzroy|collingwood|st kilda|southbank/,                                         "Melbourne",  "Australia", "🇦🇺"],
  [/great barrier reef|cairns|port douglas/,                                                   "Cairns",     "Australia", "🇦🇺"],
  [/uluru|alice springs|red centre/,                                                           "Uluru",      "Australia", "🇦🇺"],
  [/bali|ubud|seminyak|canggu|uluwatu|kuta|sanur/,                                             "Bali",       "Indonesia", "🇮🇩"],
  [/bangkok|chiang mai|phuket|ko samui/,                                                       "Thailand",   "Thailand",  "🇹🇭"],
  [/paris|eiffel|louvre|montmartre|marais/,                                                    "Paris",      "France",    "🇫🇷"],
  [/rome|colosseum|trastevere|vatican/,                                                        "Rome",       "Italy",     "🇮🇹"],
  [/florence|uffizi|ponte vecchio/,                                                            "Florence",   "Italy",     "🇮🇹"],
  [/new york|manhattan|brooklyn|lower east|soho/,                                              "New York",   "USA",       "🇺🇸"],
  [/london|shoreditch|brixton|covent/,                                                         "London",     "UK",        "🇬🇧"],
  [/barcelona|sagrada|gothic quarter/,                                                         "Barcelona",  "Spain",     "🇪🇸"],
];

export function extractDest(loc: string, caption: string): { name: string; country: string; flag: string } {
  const s = (loc + " " + caption).toLowerCase();
  for (const [re, name, country, flag] of DEST_MAP) {
    if (re.test(s)) return { name, country, flag };
  }
  const parts = loc.split(",").map(p => p.trim()).filter(Boolean);
  return { name: parts[0] || "Unnamed", country: parts[1] || "", flag: "🌍" };
}

export function buildDests(posts: Post[]): Destination[] {
  const map: Record<string, Destination> = {};
  posts.forEach(p => {
    const d = extractDest(p.location, p.caption);
    const key = `${d.name}||${d.country}`;
    if (!map[key]) {
      map[key] = { ...d, key, cover: COVERS[d.name] ?? p.thumb, items: [] };
    }
    map[key].items.push({ ...p, category: classify(p.caption) });
  });
  return Object.values(map).sort((a, b) => b.items.length - a.items.length);
}

export const parseDate   = (str: string) => str ? new Date(str + "T12:00:00") : null;
export const daysBetween = (a: Date | null, b: Date | null) => a && b ? Math.round((b.getTime() - a.getTime()) / 86400000) : null;
export const fmtDate     = (d: Date | null) => d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
export const addDays     = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
