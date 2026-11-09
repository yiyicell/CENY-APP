import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";
import { formatearFechaCO } from "@/utils/date";

type AporteCardProps = {
  metaNombre?: string | null;
  fecha: string;
  valor: number;
};

export function AporteCard({ metaNombre, fecha, valor }: AporteCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>🎯</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.metaNombre} numberOfLines={1}>
          {metaNombre || "Aporte a meta"}
        </Text>
        <Text style={styles.fecha}>{formatearFechaCO(fecha)}</Text>
      </View>
      <Text style={styles.valor}>${valor.toLocaleString("es-CO")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366F122",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  metaNombre: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 15,
  },
  fecha: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  valor: {
    color: "#818CF8",
    fontWeight: "700",
    fontSize: 15,
  },
});
