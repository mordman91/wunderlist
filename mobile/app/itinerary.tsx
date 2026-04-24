import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CATEGORIES } from "@/constants";
import {
  addDays, buildDests, daysBetween, Destination,
  fmtDate, parseDate, Post,
} from "@/utils/classify";
import { generateItinerary, Itinerary } from "@/utils/api";
import { loadPosts, loadStarred } from "@/utils/storage";

const GOLD = "#C9A96E";
const BG   = "#07070F";
const DARK = "#10101E";

export default function ItineraryScreen() {
  const router      = useRouter();
  const { key }     = useLocalSearchParams<{ key: string }>();

  const [dest, setDest]           = useState<Destination | null>(null);
  const [starred, setStarred]     = useState<Record<string, boolean>>({});
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showTrip, setShowTrip]   = useState(true);
  const [trip, setTrip]           = useState({ origin: "", arrival: "", departure: "", travelers: "2", notes: "" });

  useEffect(() => {
    Promise.all([loadPosts(), loadStarred()]).then(([posts, s]) => {
      setDest(buildDests(posts).find(d => d.key === key) ?? null);
      setStarred(s);
    });
  }, [key]);

  const starCount = () => Object.keys(starred).filter(k => k.startsWith(key + "::")).length;

  const arrDate = parseDate(trip.arrival);
  const depDate = parseDate(trip.departure);
  const numDays = daysBetween(arrDate, depDate);

  const handleGenerate = async () => {
    if (!dest) return;
    setShowTrip(false);
    setGenerating(true);
    setItinerary(null);

    const allItems = dest.items;
    const pool     = allItems.filter(i => starred[`${key}::${i.id}`]);
    const use      = pool.length > 0 ? pool : allItems;
    const cap      = Math.max(1, Math.min(numDays ?? 3, 10));
    const labels   = Array.from({ length: cap }, (_, i) =>
      arrDate ? fmtDate(addDays(arrDate, i)) : `Day ${i + 1}`
    );

    const prompt = `You are an expert travel curator. Return ONLY valid JSON — no markdown, no explanation.

TRIP:
- Destination: ${dest.name}, ${dest.country}
- Flying from: ${trip.origin || "unspecified"}
- Arrival: ${arrDate ? fmtDate(arrDate) : "TBD"} | Departure: ${depDate ? fmtDate(depDate) : "TBD"}
- Days on ground: ${cap}
- Day labels: ${labels.map((l, i) => `Day${i + 1}="${l}"`).join(", ")}
- Travelers: ${trip.travelers}
- Notes: ${trip.notes || "none"}

SAVED PLACES:
${use.map(i => `[${i.category.toUpperCase()}] ${i.location}: ${i.caption.slice(0, 140)}`).join("\n")}

RULES:
1. Produce EXACTLY ${cap} day objects.
2. Day 1: Arrival day — max 2 slots, afternoon start, acknowledge jet lag.
3. Day ${cap}: Departure — 1 morning slot only.
4. Other days: 3-4 slots, mix categories, group geographically.
5. All tips must be specific: times, booking URLs, prices, exact dishes.

Return this JSON (no other text):
{"destination":"${dest.name}, ${dest.country}","tagline":"evocative one-liner","summary":"2 sentences","tips":["tip1","tip2","tip3"],"days":[{"day":1,"label":"${labels[0]}","theme":"short theme","area":"main area","slots":[{"time":"Afternoon","icon":"🏙️","place":"name","area":"district","category":"experience","tip":"specific tip","est":"~X hrs"}]}]}`;

    try {
      const result = await generateItinerary(prompt);
      setItinerary(result);
    } catch {
      // Graceful offline fallback
      const fallbackDays = Array.from({ length: cap }, (_, i) => ({
        day: i + 1, label: labels[i],
        theme: i === 0 ? "Arrival & First Impressions" : i === cap - 1 ? "Final Morning" : ["Explore & Wander", "Markets & Culture", "Food & Nightlife"][i % 3],
        area: dest.name,
        slots: i === 0
          ? [{ time: "Afternoon", icon: "🏙️", place: "Neighbourhood walk", area: dest.name, category: "experience", tip: "Drop your bags and walk. No agenda.", est: "~2 hrs" },
             { time: "Evening",   icon: "🍽️", place: "Local dinner",        area: dest.name, category: "food",       tip: "Easy first night — book 24hrs ahead.", est: "~2 hrs" }]
          : i === cap - 1
          ? [{ time: "Morning", icon: "☕", place: "Final breakfast", area: dest.name, category: "food", tip: "Pack before heading out.", est: "~1 hr" }]
          : use.slice(i * 3, i * 3 + 3).map((item, si) => ({
              time:     ["Morning", "Afternoon", "Evening"][si],
              icon:     ["☀️", "🌤️", "🌆"][si],
              place:    item.location.split(",")[0],
              area:     dest.name,
              category: item.category,
              tip:      item.caption.slice(0, 120),
              est:      "~2 hrs",
            })),
      }));
      setItinerary({
        destination: `${dest.name}, ${dest.country}`,
        tagline:     "Every great journey starts with a single save.",
        summary:     `${cap} days in ${dest.name} curated from your saves.`,
        tips:        ["Book highlights 2-4 weeks ahead", "Arrive early to beat crowds", "Keep cash for markets"],
        days:        fallbackDays,
      });
    }
    setGenerating(false);
  };

  if (!dest) {
    return <View style={{ flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={GOLD} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* Trip details form */}
        {showTrip && (
          <View style={s.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
            <View style={s.modalBox}>
              <Text style={s.modalLabel}>Trip Details</Text>
              <Text style={s.modalTitle}>Plan {dest.name}</Text>
              <Text style={s.modalSub}>Enter your dates for a calibrated itinerary — arrival and departure logistics included.</Text>

              {(["Flying from", "Arrival date", "Departure date"] as const).map((lbl, idx) => {
                const keys = ["origin", "arrival", "departure"] as const;
                return (
                  <View key={lbl} style={{ marginBottom: 12 }}>
                    <Text style={s.fieldLabel}>{lbl}</Text>
                    <TextInput
                      style={s.input}
                      value={trip[keys[idx]]}
                      onChangeText={v => setTrip(p => ({ ...p, [keys[idx]]: v }))}
                      placeholder={idx === 0 ? "e.g. Chicago (ORD)" : "YYYY-MM-DD"}
                      placeholderTextColor="#3A3530"
                      autoCapitalize="none"
                    />
                  </View>
                );
              })}

              {numDays !== null && numDays > 0 && (
                <View style={s.daysBox}>
                  <Text style={{ color: GOLD, fontSize: 14, fontWeight: "500", textAlign: "center" }}>
                    {numDays} {numDays === 1 ? "day" : "days"} · {fmtDate(arrDate)} → {fmtDate(depDate)}
                  </Text>
                </View>
              )}

              <Text style={[s.fieldLabel, { marginBottom: 8 }]}>Travelers</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {["1", "2", "3", "4", "5+"].map(n => (
                  <Pressable
                    key={n}
                    style={[s.travBtn, trip.travelers === n && { borderColor: GOLD, backgroundColor: GOLD + "20" }]}
                    onPress={() => setTrip(p => ({ ...p, travelers: n }))}
                  >
                    <Text style={{ color: trip.travelers === n ? GOLD : "#5A5448", fontSize: 14 }}>{n}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[s.input, { height: 72, textAlignVertical: "top", marginBottom: 20 }]}
                value={trip.notes}
                onChangeText={v => setTrip(p => ({ ...p, notes: v }))}
                placeholder="e.g. vegetarian, slow pace, budget conscious…"
                placeholderTextColor="#3A3530"
                multiline
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={[s.ghostBtn, { flex: 1 }]} onPress={() => router.back()}>
                  <Text style={s.ghostBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[s.goldBtn, { flex: 2 }]} onPress={handleGenerate}>
                  <Text style={s.goldBtnText}>Generate Itinerary ✨</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Generating spinner */}
        {generating && !showTrip && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 48, marginBottom: 20 }}>✈️</Text>
            <Text style={{ color: "#EAE6DC", fontSize: 24, fontWeight: "300", marginBottom: 8 }}>Crafting your itinerary…</Text>
            <Text style={{ color: "#4A4440", fontSize: 14 }}>Building {numDays ?? 3} days for {dest.name}</Text>
          </View>
        )}

        {/* Itinerary */}
        {!generating && !showTrip && itinerary && (
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: 28 }}>
              <Text style={{ color: "#4A4440", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>← Back to {dest.name}</Text>
            </Pressable>

            <Text style={{ color: GOLD, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
              ✈️ {trip.origin ? `${trip.origin} → ` : ""}{itinerary.destination}{numDays ? ` · ${numDays} days` : ""}
            </Text>
            <Text style={{ color: "#EAE6DC", fontSize: 32, fontWeight: "300", lineHeight: 38, marginBottom: 10 }}>{itinerary.destination}</Text>
            <Text style={{ color: "#7A7060", fontSize: 17, fontStyle: "italic", lineHeight: 26, marginBottom: 8 }}>{itinerary.tagline}</Text>
            <Text style={{ color: "#4A4440", fontSize: 13, lineHeight: 20, marginBottom: 28 }}>{itinerary.summary}</Text>

            {itinerary.tips?.length > 0 && (
              <View style={s.tipsBox}>
                <Text style={{ color: GOLD, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>📋 Before You Go</Text>
                {itinerary.tips.map((t, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: i < itinerary.tips.length - 1 ? 8 : 0 }}>
                    <Text style={{ color: GOLD }}>→</Text>
                    <Text style={{ color: "#7A7060", fontSize: 13, lineHeight: 20, flex: 1 }}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            {itinerary.days.map(day => (
              <View key={day.day} style={{ marginBottom: 36 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <View style={s.dayBadge}>
                    <Text style={{ color: BG, fontSize: 14, fontWeight: "700" }}>{day.day}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: GOLD, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>{day.label}{day.area ? ` · ${day.area}` : ""}</Text>
                    <Text style={{ color: "#EAE6DC", fontSize: 20, fontWeight: "300", marginTop: 2 }}>{day.theme}</Text>
                  </View>
                </View>

                <View style={{ paddingLeft: 60, gap: 10 }}>
                  {day.slots.map((slot, i) => {
                    const cat = CATEGORIES[slot.category] ?? CATEGORIES.experience;
                    return (
                      <View key={i} style={[s.slotCard, { borderLeftColor: cat.color }]}>
                        <Text style={{ fontSize: 22, marginRight: 12, lineHeight: 28 }}>{slot.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                            <Text style={{ color: cat.color, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>{slot.time}</Text>
                            <Text style={{ color: "#1A1A20" }}>·</Text>
                            <Text style={{ color: "#3A3440", fontSize: 9 }}>{cat.icon} {cat.label}</Text>
                            {slot.est && <><Text style={{ color: "#1A1A20" }}>·</Text><Text style={{ color: "#3A3440", fontSize: 9 }}>⏱ {slot.est}</Text></>}
                          </View>
                          <Text style={{ color: "#EAE6DC", fontSize: 15, fontWeight: "500", marginBottom: 5 }}>{slot.place}</Text>
                          <Text style={{ color: "#4A4448", fontSize: 12, lineHeight: 18, fontStyle: "italic" }}>💡 {slot.tip}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={s.footerBox}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🧳</Text>
              <Text style={{ color: GOLD, fontSize: 17, fontStyle: "italic", marginBottom: 16 }}>{dest.name} awaits.</Text>
              <Pressable style={s.ghostBtn} onPress={() => setShowTrip(true)}>
                <Text style={[s.ghostBtnText, { color: GOLD }]}>✏️ Edit & Regenerate</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay:     { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalBox:    { backgroundColor: DARK, borderRadius: 24, padding: 24, width: "100%", maxWidth: 440, maxHeight: "92%", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalLabel:  { color: GOLD, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  modalTitle:  { color: "#EAE6DC", fontSize: 26, fontWeight: "300", marginBottom: 6 },
  modalSub:    { color: "#5A5448", fontSize: 13, lineHeight: 20, marginBottom: 20 },
  fieldLabel:  { color: "#5A5448", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input:       { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#EAE6DC", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 4 },
  daysBox:     { backgroundColor: "rgba(201,169,110,0.1)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,169,110,0.25)", padding: 12, marginBottom: 14 },
  travBtn:     { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingVertical: 10, alignItems: "center" },
  goldBtn:     { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  goldBtnText: { color: BG, fontSize: 13, fontWeight: "700" },
  ghostBtn:    { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 14, alignItems: "center" },
  ghostBtnText: { color: "#8A8070", fontSize: 13 },
  tipsBox:     { backgroundColor: "rgba(201,169,110,0.07)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(201,169,110,0.2)", padding: 20, marginBottom: 32 },
  dayBadge:    { width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" },
  slotCard:    { flexDirection: "row", alignItems: "flex-start", padding: 14, backgroundColor: "rgba(255,255,255,0.025)", borderLeftWidth: 3, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  footerBox:   { backgroundColor: "rgba(201,169,110,0.05)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(201,169,110,0.14)", padding: 28, alignItems: "center", marginTop: 16 },
});
