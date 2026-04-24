import React, { useEffect, useRef, useState } from "react";
import {
  Alert, FlatList, Image, Pressable, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useShareIntent } from "expo-share-intent";

import { CATEGORIES, DEMO_POSTS } from "@/constants";
import { buildDests, classify, extractDest, Destination, Post } from "@/utils/classify";
import { parseUrl } from "@/utils/api";
import { clearAll, loadPosts, loadStarred, savePosts, saveStarred } from "@/utils/storage";

const GOLD = "#C9A96E";
const BG   = "#07070F";
const DARK = "#10101E";

export default function HomeScreen() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  const [posts, setPosts]           = useState<Post[]>([]);
  const [dests, setDests]           = useState<Destination[]>([]);
  const [starred, setStarred]       = useState<Record<string, boolean>>({});
  const [loading, setLoading]       = useState(true);
  const [shareModal, setShareModal] = useState(false);
  const [pastedUrl, setPastedUrl]   = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from storage on mount
  useEffect(() => {
    Promise.all([loadPosts(), loadStarred()]).then(([p, s]) => {
      setPosts(p); setDests(buildDests(p)); setStarred(s); setLoading(false);
    });
  }, []);

  // Handle share intent from Instagram / other apps
  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    const url = shareIntent.webUrl ?? shareIntent.text ?? "";
    if (url) handleSaveUrl(url.trim());
    resetShareIntent();
  }, [hasShareIntent, shareIntent]);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const addPost = async (raw: Omit<Post, "id" | "savedAt" | "category">) => {
    const post: Post = {
      ...raw,
      id: Date.now(),
      savedAt: new Date().toISOString().slice(0, 10),
      category: classify(raw.caption),
    };
    const next = [post, ...posts];
    setPosts(next);
    setDests(buildDests(next));
    await savePosts(next);
    const d = extractDest(post.location, post.caption);
    showToast(`✅ Saved to ${d.flag} ${d.name}`);
    setShareModal(false);
    setPastedUrl("");
  };

  const handleSaveUrl = async (url: string) => {
    if (!url) return;
    setUrlLoading(true);
    try {
      const meta = await parseUrl(url);
      await addPost({ url, ...meta });
    } catch {
      showToast("⚠️ Couldn't fetch that URL");
    }
    setUrlLoading(false);
  };

  const starCount = (destKey: string) =>
    Object.keys(starred).filter(k => k.startsWith(destKey + "::")).length;

  const handleClearAll = () => {
    Alert.alert("Clear all saves?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        setPosts([]); setDests([]); setStarred({});
        await clearAll();
      }},
    ]);
  };

  const handleLoadSample = async () => {
    const sample = DEMO_POSTS.map(p => ({ ...p, category: classify(p.caption) })) as Post[];
    setPosts(sample); setDests(buildDests(sample));
    await savePosts(sample);
    showToast("✅ Sample destinations loaded");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* SHARE MODAL */}
      {shareModal && (
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShareModal(false)} />
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Save from Instagram</Text>
            <Text style={s.modalSub}>
              On your phone: tap the send icon on any post → scroll the share sheet → tap Wunderlist.
              {"\n\n"}Or paste a link below:
            </Text>
            <View style={s.row}>
              <TextInput
                style={s.input}
                value={pastedUrl}
                onChangeText={setPastedUrl}
                placeholder="https://www.instagram.com/p/…"
                placeholderTextColor="#3A3530"
                onSubmitEditing={() => handleSaveUrl(pastedUrl.trim())}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Pressable
                style={[s.goldBtn, { opacity: pastedUrl && !urlLoading ? 1 : 0.35 }]}
                onPress={() => handleSaveUrl(pastedUrl.trim())}
                disabled={!pastedUrl || urlLoading}
              >
                {urlLoading
                  ? <ActivityIndicator color={BG} size="small" />
                  : <Text style={s.goldBtnText}>Save</Text>
                }
              </Pressable>
            </View>
            <Pressable style={s.ghostBtn} onPress={() => setShareModal(false)}>
              <Text style={s.ghostBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* TOAST */}
      {toast && (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* NAV */}
        <View style={s.nav}>
          <Text style={s.logo}>wunderlist</Text>
          <View style={s.row}>
            <Text style={s.navSub}>{posts.length} saves</Text>
            {posts.length > 0 && (
              <Pressable style={s.clearBtn} onPress={handleClearAll}>
                <Text style={{ color: "#5A5448", fontSize: 12 }}>Clear</Text>
              </Pressable>
            )}
            <Pressable style={s.goldBtn} onPress={() => setShareModal(true)}>
              <Text style={s.goldBtnText}>+ Save</Text>
            </Pressable>
          </View>
        </View>

        {/* CONTENT */}
        {dests.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🗺️</Text>
            <Text style={s.emptyTitle}>No saves yet</Text>
            <Text style={s.emptySub}>
              Share any travel post from Instagram directly to Wunderlist — or paste a link, or load sample destinations to explore.
            </Text>
            <Pressable style={[s.ghostBtn, { marginTop: 24 }]} onPress={handleLoadSample}>
              <Text style={[s.ghostBtnText, { color: GOLD }]}>Load sample destinations →</Text>
            </Pressable>
            <Pressable style={[s.goldBtn, { marginTop: 12, paddingHorizontal: 28 }]} onPress={() => setShareModal(true)}>
              <Text style={s.goldBtnText}>+ Save a Post</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={dests}
            keyExtractor={d => d.key}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View style={{ marginBottom: 24 }}>
                <Text style={s.heading}>Destination Buckets</Text>
                <Text style={s.subheading}>Every save, sorted by where it is — ready to plan from.</Text>
              </View>
            }
            renderItem={({ item: dest }) => {
              const cats: Record<string, number> = {};
              dest.items.forEach(i => { cats[i.category] = (cats[i.category] ?? 0) + 1; });
              const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
              const sc  = starCount(dest.key);
              return (
                <Pressable
                  style={s.destCard}
                  onPress={() => router.push({ pathname: "/destination", params: { key: dest.key } })}
                >
                  <View style={{ position: "relative", height: 160, borderRadius: 18, overflow: "hidden" }}>
                    <Image source={{ uri: dest.cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(7,7,15,0.95)"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 6 }}>
                      <View style={s.badge}>
                        <Text style={{ color: GOLD, fontSize: 10 }}>{dest.items.length} saves</Text>
                      </View>
                      {sc > 0 && (
                        <View style={[s.badge, { backgroundColor: GOLD }]}>
                          <Text style={{ color: BG, fontSize: 10, fontWeight: "700" }}>★ {sc}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ position: "absolute", bottom: 12, left: 14 }}>
                      <Text style={{ color: GOLD, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>{dest.country}</Text>
                      <Text style={{ color: "#EAE6DC", fontSize: 22, fontWeight: "300" }}>{dest.flag} {dest.name}</Text>
                    </View>
                  </View>
                  <View style={s.destFooter}>
                    <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap", flex: 1 }}>
                      {top.map(([cat, count]) => {
                        const cfg = CATEGORIES[cat];
                        return cfg ? (
                          <View key={cat} style={[s.catPill, { borderColor: cfg.color + "55", backgroundColor: cfg.color + "15" }]}>
                            <Text style={{ fontSize: 10, color: cfg.color }}>{cfg.icon} {count}</Text>
                          </View>
                        ) : null;
                      })}
                    </View>
                    <Text style={{ color: "#3A3530", fontSize: 18 }}>→</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  nav:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  logo:         { fontSize: 24, color: GOLD, fontWeight: "300", letterSpacing: 1 },
  navSub:       { fontSize: 11, color: "#3A3530", marginRight: 8 },
  row:          { flexDirection: "row", alignItems: "center", gap: 8 },
  heading:      { fontSize: 28, color: "#EAE6DC", fontWeight: "300", letterSpacing: -0.5, marginBottom: 6 },
  subheading:   { fontSize: 13, color: "#4A4440", lineHeight: 20 },
  destCard:     { marginBottom: 16, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" },
  destFooter:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 8 },
  badge:        { backgroundColor: "rgba(7,7,15,0.7)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  catPill:      { borderRadius: 99, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  goldBtn:      { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  goldBtnText:  { color: BG, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  ghostBtn:     { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 20, paddingVertical: 12, alignItems: "center" },
  ghostBtnText: { color: "#8A8070", fontSize: 13 },
  clearBtn:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle:   { fontSize: 24, color: "#EAE6DC", fontWeight: "300", marginBottom: 10 },
  emptySub:     { fontSize: 13, color: "#4A4440", lineHeight: 20, textAlign: "center", maxWidth: 300 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox:     { backgroundColor: DARK, borderRadius: 24, padding: 28, width: "100%", maxWidth: 420, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle:   { fontSize: 22, color: "#EAE6DC", fontWeight: "300", marginBottom: 8 },
  modalSub:     { fontSize: 13, color: "#5A5448", lineHeight: 20, marginBottom: 20 },
  input:        { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#EAE6DC", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  toast:        { position: "absolute", bottom: 32, alignSelf: "center", backgroundColor: "rgba(76,175,130,0.15)", borderWidth: 1, borderColor: "rgba(76,175,130,0.45)", borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12, zIndex: 200 },
  toastText:    { color: "#4CAF82", fontSize: 13 },
});
