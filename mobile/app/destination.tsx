import React, { useEffect, useState } from "react";
import {
  FlatList, Image, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, View, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CATEGORIES } from "@/constants";
import { buildDests, Destination } from "@/utils/classify";
import { loadPosts, toggleStarPost } from "@/utils/storage";

const GOLD = "#C9A96E";
const BG   = "#07070F";

export default function DestinationScreen() {
  const router                    = useRouter();
  const { key }                   = useLocalSearchParams<{ key: string }>();
  const [dest, setDest]           = useState<Destination | null>(null);
  const [catFilter, setCatFilter] = useState<string>("all");

  useEffect(() => {
    loadPosts().then(posts => {
      setDest(buildDests(posts).find(d => d.key === key) ?? null);
    });
  }, [key]);

  const toggleStar = async (itemId: string) => {
    setDest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, starred: !i.starred } : i),
      };
    });
    const current = dest?.items.find(i => i.id === itemId);
    if (current) await toggleStarPost(itemId, !current.starred);
  };

  const isStar    = (id: string) => dest?.items.find(i => i.id === id)?.starred ?? false;
  const starCount = () => dest?.items.filter(i => i.starred).length ?? 0;

  if (!dest) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  const allItems = dest.items;
  const filtered = catFilter === "all" ? allItems : allItems.filter(i => i.category === catFilter);
  const usedCats = [...new Set(allItems.map(i => i.category))];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={{ height: 240, position: "relative" }}>
        <Image source={{ uri: dest.cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={["transparent", BG]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Destinations</Text>
          </Pressable>
        </SafeAreaView>
        <View style={{ position: "absolute", bottom: 16, left: 20 }}>
          <Text style={{ color: GOLD, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>
            {dest.country} · {dest.items.length} saves
          </Text>
          <Text style={{ color: "#EAE6DC", fontSize: 30, fontWeight: "300" }}>{dest.flag} {dest.name}</Text>
        </View>
      </View>

      {/* Category filter + Plan button */}
      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingVertical: 10 }}>
          {[{ key: "all", label: "All", icon: "🗺️", color: GOLD }, ...usedCats.map(k => ({ key: k, ...CATEGORIES[k] }))].map(cat => (
            <Pressable
              key={cat.key}
              onPress={() => setCatFilter(cat.key)}
              style={[s.filterPill, catFilter === cat.key && { borderColor: cat.color, backgroundColor: cat.color + "20" }]}
            >
              <Text style={{ color: catFilter === cat.key ? cat.color : "#5A5448", fontSize: 12 }}>
                {cat.icon} {cat.label ?? "All"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={s.planBtn} onPress={() => router.push({ pathname: "/itinerary", params: { key: dest.key } })}>
          <Text style={s.planBtnText}>✈️ Plan Trip{starCount() > 0 ? ` (${starCount()} ★)` : ""}</Text>
        </Pressable>
      </View>

      {starCount() === 0 && (
        <View style={s.starHint}>
          <Text style={{ color: "#3A3530", fontSize: 12, textAlign: "center" }}>
            ☆ Star places you want in your itinerary — then hit Plan Trip
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const cfg     = CATEGORIES[item.category];
          const starred = isStar(item.id);
          return (
            <View style={[s.postCard, { flex: 1, borderColor: starred ? (cfg?.color ?? GOLD) + "55" : "rgba(255,255,255,0.06)" }]}>
              <View style={{ position: "relative", height: 120, borderRadius: 12, overflow: "hidden" }}>
                <Image source={{ uri: item.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <LinearGradient colors={["transparent", "rgba(7,7,15,0.9)"]} style={StyleSheet.absoluteFill} />
                <Pressable
                  style={[s.starBtn, { backgroundColor: starred ? cfg?.color ?? GOLD : "rgba(7,7,15,0.6)" }]}
                  onPress={() => toggleStar(item.id)}
                >
                  <Text style={{ fontSize: 14, color: starred ? BG : "#EAE6DC" }}>{starred ? "★" : "☆"}</Text>
                </Pressable>
                <Text style={s.postLocation} numberOfLines={1}>{item.location.split(",")[0]}</Text>
              </View>
              <View style={{ padding: 10 }}>
                {cfg && (
                  <Text style={{ color: cfg.color, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    {cfg.icon} {cfg.label}
                  </Text>
                )}
                <Text style={{ color: "#5A5050", fontSize: 11, lineHeight: 16 }} numberOfLines={3}>
                  {item.caption}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ color: "#2A2A30", fontSize: 9 }}>{item.username}</Text>
                  {item.likes > 0 && <Text style={{ color: "#2A2A30", fontSize: 9 }}>{(item.likes / 1000).toFixed(1)}k ♥</Text>}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  backBtn:      { margin: 16, backgroundColor: "rgba(7,7,15,0.65)", borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  backBtnText:  { color: "#EAE6DC", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  filterBar:    { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(7,7,15,0.96)" },
  filterPill:   { borderRadius: 99, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 6 },
  planBtn:      { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 12, flexShrink: 0 },
  planBtnText:  { color: "#07070F", fontSize: 12, fontWeight: "700" },
  starHint:     { backgroundColor: "rgba(255,255,255,0.02)", margin: 12, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  postCard:     { borderRadius: 14, overflow: "hidden", borderWidth: 1, backgroundColor: "rgba(255,255,255,0.025)" },
  postLocation: { position: "absolute", bottom: 8, left: 10, right: 40, color: "#EAE6DC", fontSize: 11, fontWeight: "500" },
  starBtn:      { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
