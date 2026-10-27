import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Inicio", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="gasto"
        options={{ title: "Gastos", tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="metas"
        options={{ title: "Metas", tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="reportes"
        options={{ title: "Reportes", tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
