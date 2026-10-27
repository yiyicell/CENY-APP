import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { GastoCard } from "@/components/GastoCard";

type Gasto = {
  id: string;
  valor: number;
  fecha_gasto: string;
  descripcion: string | null;
  categorias: { nombre: string } | null;
};
type Filtro = "hoy" | "semana" | "mes";

const iconosPorCategoria: Record<string, string> = {
  Alimentación: "🍽️",
  Transporte: "🚌",
  Vivienda: "🏠",
  Ocio: "🎮",
  Salud: "❤️",
  Otros: "📦",
};

export default function HistorialGastosScreen() {
  const router = useRouter();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("mes");
  const [busqueda, setBusqueda] = useState("");

  useFocusEffect(
    useCallback(() => {
      cargarGastos();
    }, [filtro])
  );

  async function cargarGastos() {
    setCargando(true);
    const hoy = new Date();
    const desde = new Date();
    if (filtro === "semana") desde.setDate(hoy.getDate() - 7);
    if (filtro === "mes") desde.setDate(hoy.getDate() - 30);

    const { data, error } = await supabase
      .from("gastos")
      .select("id, valor, fecha_gasto, descripcion, categorias(nombre)")
      .gte("fecha_gasto", desde.toISOString().split("T")[0])
      .order("fecha_gasto", { ascending: false });

    if (!error && data) setGastos(data as unknown as Gasto[]);
    setCargando(false);
    setRefrescando(false);
  }

  function onRefresh() {
    setRefrescando(true);
    cargarGastos();
  }

  const gastosFiltrados = gastos.filter((g) =>
    (g.categorias?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial Gastos</Text>

      <TouchableOpacity
        onPress={() => router.push("/nuevo-gasto")}
        style={styles.btnNuevoGasto}
      >
        <Text style={{ color: colors.background, fontWeight: "700" }}>
          + Nuevo gasto
        </Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Buscar gasto..."
        placeholderTextColor={colors.textSecondary}
        value={busqueda}
        onChangeText={setBusqueda}
        style={styles.search}
      />
      <View style={styles.tabs}>
        {(["hoy", "semana", "mes"] as Filtro[]).map((opcion) => (
          <TouchableOpacity
            key={opcion}
            onPress={() => setFiltro(opcion)}
            style={[styles.tab, filtro === opcion && styles.tabActivo]}
          >
            <Text
              style={{
                color:
                  filtro === opcion ? colors.background : colors.textSecondary,
                fontWeight: "600",
              }}
            >
              {opcion === "hoy"
                ? "Hoy"
                : opcion === "semana"
                ? "Semana"
                : "Mes"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {cargando && !refrescando ? (
        <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
          Cargando...
        </Text>
      ) : (
        <FlatList
          data={gastosFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.success}
            />
          }
          renderItem={({ item }) => (
            <GastoCard
              categoria={item.categorias?.nombre ?? "Sin categoría"}
              fecha={item.fecha_gasto}
              valor={item.valor}
              icono={iconosPorCategoria[item.categorias?.nombre ?? ""] ?? "💸"}
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
              No hay gastos en este periodo.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  btnNuevoGasto: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-end",
    marginBottom: 14,
  },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  tabs: { flexDirection: "row", marginBottom: 16, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  tabActivo: { backgroundColor: colors.success },
});
