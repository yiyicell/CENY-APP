import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { obtenerMetasAPI } from "@/services/api";

type Meta = {
  id: string;
  nombre: string;
  valor_objetivo: number;
  fecha_objetivo: string;
  frecuencia_ahorro?: string;
  estado?: string;
  total_ahorrado?: number;
  progreso_porcentaje?: number;
  cuota_sugerida?: number;
  periodos_restantes?: number;
  aportado?: number;
};

export default function MetasScreen() {
  const router = useRouter();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setCargando(true);
    try {
      // Intentar cargar a través de la API REST de FastAPI
      const metasAPI = await obtenerMetasAPI();
      if (Array.isArray(metasAPI)) {
        setMetas(
          metasAPI.map((m: any) => ({
            ...m,
            aportado: Number(m.total_ahorrado ?? 0),
          }))
        );
        setCargando(false);
        setRefrescando(false);
        return;
      }
    } catch (e) {
      // Fallback a consulta directa de Supabase
    }

    const { data: metasData } = await supabase
      .from("metas")
      .select("id, nombre, valor_objetivo, fecha_objetivo, frecuencia_ahorro, estado")
      .order("fecha_objetivo");
    const { data: aportesData } = await supabase
      .from("aportes")
      .select("meta_id, valor");

    const totales: Record<string, number> = {};
    (aportesData ?? []).forEach((a) => {
      totales[a.meta_id] = (totales[a.meta_id] ?? 0) + Number(a.valor);
    });

    setMetas(
      (metasData ?? []).map((m) => ({
        ...m,
        aportado: totales[m.id] ?? 0,
      }))
    );
    setCargando(false);
    setRefrescando(false);
  }

  function onRefresh() {
    setRefrescando(true);
    cargar();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metas de ahorro</Text>
      <TouchableOpacity
        onPress={() => router.push("/nueva-meta")}
        style={styles.botonNueva}
      >
        <Text style={{ color: colors.background, fontWeight: "700" }}>
          + Nueva meta
        </Text>
      </TouchableOpacity>

      {cargando && !refrescando ? (
        <Text style={{ color: colors.textSecondary }}>Cargando metas...</Text>
      ) : (
        <FlatList
          data={metas}
          keyExtractor={(m) => m.id}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.success}
            />
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
              Aún no tienes metas de ahorro registradas.
            </Text>
          }
          renderItem={({ item }) => {
            const aportado = item.total_ahorrado ?? item.aportado ?? 0;
            const objetivo = Number(item.valor_objetivo);
            const progreso = objetivo > 0 ? Math.min(aportado / objetivo, 1) : 0;
            const esCumplida = item.estado === "cumplido" || progreso >= 1;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <View
                    style={[
                      styles.badge,
                      esCumplida ? styles.badgeCumplida : styles.badgePendiente,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        esCumplida
                          ? styles.badgeTextCumplida
                          : styles.badgeTextPendiente,
                      ]}
                    >
                      {esCumplida ? "Completada 🎉" : "En progreso"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.montos}>
                  ${aportado.toLocaleString("es-CO")} / $
                  {objetivo.toLocaleString("es-CO")}
                </Text>

                <View style={styles.barraFondo}>
                  <View
                    style={[
                      styles.barraRelleno,
                      { width: `${Math.round(progreso * 100)}%` },
                      esCumplida && { backgroundColor: "#10B981" },
                    ]}
                  />
                </View>

                {item.cuota_sugerida !== undefined && !esCumplida ? (
                  <View style={styles.cuotaContainer}>
                    <Text style={styles.cuotaTexto}>
                      💡 Cuota sugerida:{" "}
                      <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                        ${Math.round(item.cuota_sugerida).toLocaleString("es-CO")}
                      </Text>{" "}
                      / {item.frecuencia_ahorro ?? "mes"} ({item.periodos_restantes ?? 1}{" "}
                      períodos restantes)
                    </Text>
                  </View>
                ) : null}

                <View style={styles.filaInferior}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {Math.round(progreso * 100)}% · Límite: {item.fecha_objetivo}
                  </Text>
                  {!esCumplida && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/nuevo-aporte",
                          params: { metaId: item.id, nombre: item.nombre },
                        })
                      }
                      style={styles.botonAbonar}
                    >
                      <Text style={styles.botonAbonarTexto}>+ Abonar</Text>
                    </TouchableOpacity>
                  )}
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
  botonNueva: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombre: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendiente: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  badgeCumplida: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextPendiente: {
    color: "#60A5FA",
  },
  badgeTextCumplida: {
    color: "#34D399",
  },
  montos: {
    color: colors.success,
    fontWeight: "700",
    fontSize: 18,
    marginVertical: 8,
  },
  barraFondo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },
  barraRelleno: {
    height: 8,
    backgroundColor: colors.success,
  },
  cuotaContainer: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 8,
    borderRadius: 8,
  },
  cuotaTexto: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  filaInferior: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  botonAbonar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botonAbonarTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
