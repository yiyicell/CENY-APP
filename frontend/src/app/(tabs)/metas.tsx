import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";

type Meta = { id: string; nombre: string; valor_objetivo: number; fecha_objetivo: string; aportado: number };

export default function MetasScreen() {
  const router = useRouter();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setCargando(true);
    const { data: metasData } = await supabase
      .from("metas")
      .select("id, nombre, valor_objetivo, fecha_objetivo")
      .order("fecha_objetivo");
    const { data: aportesData } = await supabase.from("aportes").select("meta_id, valor");

    const totales: Record<string, number> = {};
    (aportesData ?? []).forEach((a) => {
      totales[a.meta_id] = (totales[a.meta_id] ?? 0) + Number(a.valor);
    });

    setMetas((metasData ?? []).map((m) => ({ ...m, aportado: totales[m.id] ?? 0 })));
    setCargando(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metas de ahorro</Text>
      <TouchableOpacity onPress={() => router.push("/nueva-meta")} style={styles.botonNueva}>
        <Text style={{ color: colors.background, fontWeight: "700" }}>+ Nueva meta</Text>
      </TouchableOpacity>

      {cargando ? (
        <Text style={{ color: colors.textSecondary }}>Cargando...</Text>
      ) : (
        <FlatList
          data={metas}
          keyExtractor={(m) => m.id}
          ListEmptyComponent={<Text style={{ color: colors.textSecondary }}>Aún no tienes metas.</Text>}
          renderItem={({ item }) => {
            const progreso = Math.min(item.aportado / item.valor_objetivo, 1);
            return (
              <View style={styles.card}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.montos}>
                  ${item.aportado.toLocaleString("es-CO")} / ${Number(item.valor_objetivo).toLocaleString("es-CO")}
                </Text>
                <View style={styles.barraFondo}>
                  <View style={[styles.barraRelleno, { width: `${progreso * 100}%` }]} />
                </View>
                <View style={styles.filaInferior}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {Math.round(progreso * 100)}% · Meta: {item.fecha_objetivo}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/nuevo-aporte", params: { metaId: item.id, nombre: item.nombre } })}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>Abonar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 16 },
  botonNueva: { backgroundColor: colors.success, padding: 12, borderRadius: 30, alignSelf: "flex-end", marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  nombre: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  montos: { color: colors.success, fontWeight: "700", fontSize: 18, marginVertical: 6 },
  barraFondo: { height: 8, borderRadius: 4, backgroundColor: colors.cardBorder, overflow: "hidden" },
  barraRelleno: { height: 8, backgroundColor: colors.success },
  filaInferior: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
});