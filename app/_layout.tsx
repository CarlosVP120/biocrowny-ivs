import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="delivery-scan" options={{ headerShown: false }} />
      <Stack.Screen
        name="delivery-status/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="order-completed/[id]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
