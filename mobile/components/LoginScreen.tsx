import React, { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { supabase } from "@/utils/supabase";

const GOLD = "#C9A96E";
const BG   = "#07070F";
const DARK = "#10101E";

export default function LoginScreen() {
  const [mode, setMode]         = useState<"signin" | "signup">("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setSignedUp(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) setError(error.message);
      // On success, _layout's onAuthStateChange fires and shows the app automatically
    }
  };

  if (signedUp) {
    return (
      <View style={[s.container, { backgroundColor: BG }]}>
        <Text style={s.logo}>wunderlist</Text>
        <View style={s.card}>
          <Text style={s.cardTitle}>Check your email</Text>
          <Text style={[s.sub, { marginBottom: 20 }]}>
            We sent a confirmation link to {email}. Click it to activate your account, then sign in.
          </Text>
          <Pressable style={s.ghostBtn} onPress={() => { setSignedUp(false); setMode("signin"); }}>
            <Text style={s.ghostBtnText}>← Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.container}>
        <Text style={s.logo}>wunderlist</Text>
        <Text style={s.tagline}>Your travel inspiration, organised</Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>{mode === "signin" ? "Sign in" : "Create account"}</Text>

          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#3A3530"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#3A3530"
            secureTextEntry
            textContentType={mode === "signup" ? "newPassword" : "password"}
            onSubmitEditing={handleAuth}
          />

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={[s.goldBtn, { opacity: loading || !email || !password ? 0.5 : 1 }]}
            onPress={handleAuth}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading
              ? <ActivityIndicator color={BG} />
              : <Text style={s.goldBtnText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
            }
          </Pressable>

          <Pressable onPress={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(null); }}>
            <Text style={s.toggle}>
              {mode === "signin" ? "No account yet? Create one →" : "Already have an account? Sign in →"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  logo:        { fontSize: 36, color: GOLD, fontWeight: "300", letterSpacing: 2, marginBottom: 6 },
  tagline:     { fontSize: 13, color: "#4A4440", marginBottom: 44 },
  card:        { backgroundColor: DARK, borderRadius: 24, padding: 28, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cardTitle:   { fontSize: 22, color: "#EAE6DC", fontWeight: "300", marginBottom: 20 },
  sub:         { color: "#5A5448", fontSize: 13, lineHeight: 20 },
  input:       { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#EAE6DC", paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  errorText:   { color: "#E07B54", fontSize: 12, marginBottom: 12, lineHeight: 18 },
  goldBtn:     { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  goldBtnText: { color: BG, fontSize: 14, fontWeight: "700" },
  ghostBtn:    { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 14, alignItems: "center" },
  ghostBtnText: { color: "#8A8070", fontSize: 13 },
  toggle:      { color: "#5A5448", fontSize: 13, textAlign: "center" },
});
