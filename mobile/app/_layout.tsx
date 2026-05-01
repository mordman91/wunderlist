import "react-native-url-polyfill/auto";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Session } from "@supabase/supabase-js";
import { ShareIntentProvider } from "expo-share-intent";
import { Stack } from "expo-router";
import { supabase } from "@/utils/supabase";
import LoginScreen from "@/components/LoginScreen";

const BG   = "#07070F";
const GOLD = "#C9A96E";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Checking session
  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  // Not logged in
  if (!session) return <LoginScreen />;

  // Logged in — show the app
  return (
    <ShareIntentProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BG } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="destination" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="itinerary"   options={{ presentation: "card", animation: "slide_from_right" }} />
      </Stack>
    </ShareIntentProvider>
  );
}
