import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#666666",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
        ),
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E9ECEF",
          borderTopWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              position: "absolute",
            },
            android: {
              elevation: 8,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan-order/[id]"
        options={{
          title: "Escaneo de Órdenes",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="qrcode" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
