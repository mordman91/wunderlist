export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://wunderlist-app.vercel.app";

export const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  food:       { label: "Food & Dining",      icon: "🍜", color: "#E07B54" },
  drinks:     { label: "Bars & Drinks",      icon: "🍸", color: "#9B7FD4" },
  sights:     { label: "Sights & Culture",   icon: "🏛️", color: "#5C9BE8" },
  nature:     { label: "Nature & Adventure", icon: "🌿", color: "#4CAF82" },
  nightlife:  { label: "Nightlife",          icon: "🌃", color: "#D45C8C" },
  experience: { label: "Experiences",        icon: "✨", color: "#E8C15C" },
  stay:       { label: "Where to Stay",      icon: "🏨", color: "#5CC4E8" },
};

export const COVERS: Record<string, string> = {
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

export const DEMO_POSTS = [
  { id: 1,  url: "https://www.instagram.com/p/abc001/", location: "Asakusa, Tokyo, Japan",        caption: "Sunrise at Senso-ji Temple — get there by 5:30am for pure silence 🙏 #Tokyo #Temple",                                          thumb: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop", username: "@wanderlust.jp",     likes: 88100, savedAt: "2025-01-15" },
  { id: 2,  url: "https://www.instagram.com/p/abc002/", location: "Shibuya, Tokyo, Japan",         caption: "Ichiran Ramen — Hakata tonkotsu, 18-hour broth, solo booth 🍜 Order kaedama for extra noodles. #Ramen #Tokyo",               thumb: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop", username: "@foodie_adventures", likes: 42300, savedAt: "2025-01-17" },
  { id: 3,  url: "https://www.instagram.com/p/abc003/", location: "Odaiba, Tokyo, Japan",          caption: "teamLab Borderless — infinite digital art rooms 🌊✨ Book 3 months ahead. #Tokyo #Art",                                        thumb: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop", username: "@art.everywhere",   likes: 31700, savedAt: "2025-01-20" },
  { id: 4,  url: "https://www.instagram.com/p/abc004/", location: "Shinjuku, Tokyo, Japan",        caption: "Bar Benfiddich — bartender grows herbs on the roof 🍸 Best cocktails in Tokyo. #Shinjuku",                                   thumb: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop", username: "@nightcap.travels", likes: 19400, savedAt: "2025-01-22" },
  { id: 5,  url: "https://www.instagram.com/p/abc005/", location: "Tsukiji, Tokyo, Japan",         caption: "Tsukiji Outer Market 7am — fresh uni, tuna sashimi 🐟 Cash only. Get there before 8am. #Tokyo",                             thumb: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&h=400&fit=crop", username: "@marketdays",       likes: 55600, savedAt: "2025-01-23" },
  { id: 6,  url: "https://www.instagram.com/p/abc006/", location: "Shibuya, Tokyo, Japan",         caption: "Shibuya Crossing at midnight 🌃 Mag's Park rooftop — cocktail + chaos below. #Tokyo #Nightlife",                            thumb: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600&h=400&fit=crop", username: "@citynights.asia",  likes: 127800, savedAt: "2025-01-25" },
  { id: 7,  url: "https://www.instagram.com/p/abc007/", location: "Arashiyama, Kyoto, Japan",      caption: "Bamboo Grove at 5am — zero crowds, pure green light 🎋 #Kyoto #Bamboo",                                                       thumb: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop", username: "@dawnchaser",       likes: 203000, savedAt: "2025-02-01" },
  { id: 8,  url: "https://www.instagram.com/p/abc008/", location: "Fushimi Inari, Kyoto, Japan",   caption: "Full Fushimi Inari hike — 4hrs, zero tourists past 2nd gate 🦊⛩️ Start at 6am. #Kyoto",                                     thumb: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600&h=400&fit=crop", username: "@trailblaze.asia",  likes: 149000, savedAt: "2025-02-03" },
  { id: 9,  url: "https://www.instagram.com/p/abc009/", location: "Bondi Beach, Sydney, Australia", caption: "Bondi to Coogee coastal walk — 6km of dramatic coastline 🌊 #Sydney",                                                         thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", username: "@coastalwanderer",  likes: 94200, savedAt: "2025-02-10" },
  { id: 10, url: "https://www.instagram.com/p/abc010/", location: "Ubud, Bali, Indonesia",         caption: "Tegallalang rice terraces at golden hour 🌾 Rent a scooter — the back road views are 10x better. #Bali",                     thumb: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop", username: "@ricepaddy.life",   likes: 113000, savedAt: "2025-02-20" },
  { id: 11, url: "https://www.instagram.com/p/abc011/", location: "Uluwatu, Bali, Indonesia",      caption: "Uluwatu cliff temple at sunset + Kecak fire dance 🔥 Buy tickets at 5pm. #Bali",                                             thumb: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop", username: "@soulofbali",       likes: 87600, savedAt: "2025-02-21" },
  { id: 12, url: "https://www.instagram.com/p/abc012/", location: "Seminyak, Bali, Indonesia",     caption: "Ku De Ta beachclub — Bali sunset + cold Bintang 🌅🍺 Get there at 5pm for a daybed. #Bali",                                  thumb: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop", username: "@islandvibes.bali", likes: 59300, savedAt: "2025-02-22" },
];
