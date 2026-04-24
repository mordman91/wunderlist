import { ShareIntentProvider } from "expo-share-intent";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#07070F" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="destination" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="itinerary"   options={{ presentation: "card", animation: "slide_from_right" }} />
      </Stack>
    </ShareIntentProvider>
  );
}
