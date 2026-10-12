import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

type GastoCardProps = {
  categoria: string;
  fecha: string;
  valor: number;
  icono?: string;
};

export function GastoCard({ categoria, fecha, valor, icono = "💸" }: GastoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Text style={{ fontSize: 18 }}>{icono}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.categoria}>{categoria}</Text>
        <Text style={styles.fecha}>{fecha}</Text>
      </View>
      <Text style={styles.valor}>- ${valor.toLocaleString("es-CO")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "33", alignItems: "center", justifyContent: "center", marginRight: 12 },
  categoria: { color: colors.textPrimary, fontWeight: "600", fontSize: 15 },
  fecha: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  valor: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});