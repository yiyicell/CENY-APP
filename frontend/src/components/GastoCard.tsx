import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { formatearFechaCO } from "@/utils/date";

type GastoCardProps = {
  categoria: string;
  fecha: string;
  valor: number;
  icono?: string;
  descripcion?: string | null;
  onDelete?: () => void;
};

export function GastoCard({
  categoria,
  fecha,
  valor,
  icono = "💸",
  descripcion,
  onDelete,
}: GastoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Text style={{ fontSize: 18 }}>{icono}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.categoria} numberOfLines={1}>
          {categoria}
          {descripcion ? ` · ${descripcion}` : ""}
        </Text>
        <Text style={styles.fecha}>{formatearFechaCO(fecha)}</Text>
      </View>
      <Text style={styles.valor}>- ${valor.toLocaleString("es-CO")}</Text>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          style={styles.btnDelete}
          accessibilityLabel="Eliminar gasto"
        >
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
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
    backgroundColor: colors.primary + "33",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoria: {
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
    color: colors.danger,
    fontWeight: "700",
    fontSize: 15,
  },
  btnDelete: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
