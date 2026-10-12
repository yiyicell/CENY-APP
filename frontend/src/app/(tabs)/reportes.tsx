import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

export default function ReportesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reportes</Text>
      <Text style={{ color: colors.textSecondary }}>Próximamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
});