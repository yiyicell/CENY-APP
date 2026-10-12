import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { GastoCard } from "@/components/GastoCard";

type Gasto = {
  id: string;
  valor: number;
  fecha_gasto: string;
  categorias: { nombre: string } | null;
};

const iconosPorCategoria: Record<string, string> = {
  Alimentación: "🍽️", Transporte: "🚌", Vivienda: "🏠", Ocio: "🎮", Salud: "❤️", Otros: "📦",
};

export default function HomeScreen() {
  const [nombre, setNombre] = useState("");
  const [gastosRecientes, setGastosRecientes] = useState<Gasto[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("id", userData.user.id)
      .single();
    if (usuario) setNombre(usuario.nombre);

    const { data: gastos } = await supabase
      .from("gastos")
      .select("id, valor, fecha_gasto, categorias(nombre)")
      .order("fecha_gasto", { ascending: false })
      .limit(4);
    if (gastos) setGastosRecientes(gastos as unknown as Gasto[]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.saludo}>Hola{nombre ? `, ${nombre}` : ""}</Text>
          <Text style={styles.subtitulo}>Aquí está tu resumen financiero</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: colors.textSecondary }}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>Saldo disponible</Text>
        <Text style={styles.saldoValor}>-- (pendiente de ingresos)</Text>
      </View>

      <View style={styles.filaCards}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Presupuesto</Text>
          <Text style={styles.miniValor}>-- (pendiente)</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Metas</Text>
          <Text style={styles.miniValor}>-- (pendiente)</Text>
        </View>
      </View>

      <View style={styles.recientesHeader}>
        <Text style={styles.recientesTitle}>Gastos recientes</Text>
        <Link href="/gasto" style={{ color: colors.primary, fontWeight: "600" }}>Ver todos</Link>
      </View>

      {gastosRecientes.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>Aún no tienes gastos registrados.</Text>
      ) : (
        gastosRecientes.map((g) => (
          <GastoCard
            key={g.id}
            categoria={g.categorias?.nombre ?? "Sin categoría"}
            fecha={g.fecha_gasto}
            valor={g.valor}
            icono={iconosPorCategoria[g.categorias?.nombre ?? ""] ?? "💸"}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  saludo: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
  subtitulo: { color: colors.textSecondary, marginTop: 2 },
  saldoCard: { backgroundColor: colors.card, borderRadius: 16, padding: 18, marginBottom: 12 },
  saldoLabel: { color: colors.textSecondary, fontSize: 13 },
  saldoValor: { color: colors.textPrimary, fontSize: 22, fontWeight: "700", marginTop: 6 },
  filaCards: { flexDirection: "row", gap: 12, marginBottom: 20 },
  miniCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14 },
  miniLabel: { color: colors.textSecondary, fontSize: 12 },
  miniValor: { color: colors.textPrimary, fontWeight: "600", marginTop: 4, fontSize: 13 },
  recientesHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  recientesTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
});