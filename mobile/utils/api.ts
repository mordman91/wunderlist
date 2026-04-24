import { API_BASE } from "@/constants";
import { classify, extractDest } from "./classify";

export interface ParsedPost {
  location: string;
  caption: string;
  thumb: string;
  username: string;
  likes: number;
}

export async function parseUrl(url: string): Promise<ParsedPost> {
  const res = await fetch(`${API_BASE}/api/parse-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as ParsedPost;
}

export interface ItinerarySlot {
  time: string;
  icon: string;
  place: string;
  area: string;
  category: string;
  tip: string;
  est: string;
}

export interface ItineraryDay {
  day: number;
  label: string;
  theme: string;
  area: string;
  slots: ItinerarySlot[];
}

export interface Itinerary {
  destination: string;
  tagline: string;
  summary: string;
  tips: string[];
  days: ItineraryDay[];
}

export async function generateItinerary(prompt: string): Promise<Itinerary> {
  const res = await fetch(`${API_BASE}/api/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const txt = (data.content as { text?: string }[]).map(c => c.text ?? "").join("");
  return JSON.parse(txt.replace(/```json|```/g, "").trim()) as Itinerary;
}
