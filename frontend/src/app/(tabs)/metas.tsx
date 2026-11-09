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
import { formatearFechaCO } from "@/utils/date";

type Aporte = {
  id: string;
  valor: number;
  fecha_aporte: string;
};

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
  dias_restantes?: number;
  dias_totales?: number;
  ritmo_esperado_porcentaje?: number;
  estado_seguimiento?: "cumplida" | "al_dia" | "atrasado" | "vencida";
  mensaje_seguimiento?: string;
  aportes?: Aporte[];
};

export default function MetasScreen() {
  const router = useRouter();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [metaExpandida, setMetaExpandida] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setCargando(true);
    try {
      // 1. Cargar a través de la API REST de FastAPI (con métricas algorítmicas de seguimiento)
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
      .select("id, meta_id, valor, fecha_aporte")
      .order("fecha_aporte", { ascending: false });

    const totales: Record<string, number> = {};
    const aportesPorMeta: Record<string, Aporte[]> = {};

    (aportesData ?? []).forEach((a) => {
      totales[a.meta_id] = (totales[a.meta_id] ?? 0) + Number(a.valor);
      if (!aportesPorMeta[a.meta_id]) aportesPorMeta[a.meta_id] = [];
      aportesPorMeta[a.meta_id].push({
        id: a.id,
        valor: Number(a.valor),
        fecha_aporte: a.fecha_aporte,
      });
    });

    setMetas(
      (metasData ?? []).map((m) => ({
        ...m,
        aportado: totales[m.id] ?? 0,
        aportes: aportesPorMeta[m.id] ?? [],
      }))
    );
    setCargando(false);
    setRefrescando(false);
  }

  function onRefresh() {
    setRefrescando(true);
    cargar();
  }

  function toggleExpandir(id: string) {
    setMetaExpandida((prev) => (prev === id ? null : id));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metas y Seguimiento</Text>
      <Text style={styles.subtitulo}>
        Monitorea el avance de tus objetivos de ahorro con seguimiento cronológico
      </Text>

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
              Aún no tienes metas de ahorro registradas. ¡Crea tu primera meta con el botón de arriba!
            </Text>
          }
          renderItem={({ item }) => {
            const aportado = item.total_ahorrado ?? item.aportado ?? 0;
            const objetivo = Number(item.valor_objetivo);
            const progreso = objetivo > 0 ? Math.min(aportado / objetivo, 1) : 0;
            const esCumplida = item.estado === "cumplido" || progreso >= 1;
            const estadoSeg = item.estado_seguimiento || (esCumplida ? "cumplida" : "al_dia");
            const expandida = metaExpandida === item.id;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.nombre}>{item.nombre}</Text>

                  {/* Badge de Seguimiento Inteligente */}
                  <View
                    style={[
                      styles.badge,
                      esCumplida
                        ? styles.badgeCumplida
                        : estadoSeg === "al_dia"
                        ? styles.badgeAlDia
                        : styles.badgeAtrasada,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        esCumplida
                          ? styles.badgeTextCumplida
                          : estadoSeg === "al_dia"
                          ? styles.badgeTextAlDia
                          : styles.badgeTextAtrasada,
                      ]}
                    >
                      {esCumplida
                        ? "Completada 🎉"
                        : estadoSeg === "al_dia"
                        ? "Al día 🚀"
                        : "Atrasada ⚠️"}
                    </Text>
                  </View>
                </View>

                {/* Monto y Progreso */}
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

                {/* Panel de Seguimiento Temporal y Cuota */}
                {!esCumplida && (
                  <View style={styles.seguimientoBox}>
                    <Text style={styles.seguimientoTexto}>
                      ⏱️ {item.mensaje_seguimiento || "Mantén tus aportes para llegar a tiempo."}
                    </Text>

                    {item.cuota_sugerida !== undefined && (
                      <Text style={[styles.seguimientoTexto, { marginTop: 4, fontWeight: "600" }]}>
                        💡 Cuota sugerida: ${Math.round(item.cuota_sugerida).toLocaleString("es-CO")} /{" "}
                        {item.frecuencia_ahorro ?? "mes"} ({item.periodos_restantes ?? 1} período(s) restantes)
                      </Text>
                    )}
                  </View>
                )}

                {/* Fila Inferior con Fecha en formato colombiano */}
                <View style={styles.filaInferior}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {Math.round(progreso * 100)}% · Límite: {formatearFechaCO(item.fecha_objetivo)}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {/* Botón para ver aportes */}
                    <TouchableOpacity
                      onPress={() => toggleExpandir(item.id)}
                      style={styles.botonHistorial}
                    >
                      <Text style={styles.botonHistorialTexto}>
                        {expandida ? "Ocultar" : "Historial"}
                      </Text>
                    </TouchableOpacity>

                    {/* Botón para abonar */}
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

                {/* Desglose desplegable de aportes */}
                {expandida && (
                  <View style={styles.aportesContainer}>
                    <Text style={styles.aportesTitulo}>Historial de Aportes:</Text>
                    {(!item.aportes || item.aportes.length === 0) ? (
                      <Text style={styles.aporteItemTextoVacio}>
                        Aún no has registrado ningún abono para esta meta.
                      </Text>
                    ) : (
                      item.aportes.map((a) => (
                        <View key={a.id} style={styles.aporteItemRow}>
                          <Text style={styles.aporteItemFecha}>
                            📅 {formatearFechaCO(a.fecha_aporte)}
                          </Text>
                          <Text style={styles.aporteItemMonto}>
                            + ${Number(a.valor).toLocaleString("es-CO")}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
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
    marginBottom: 2,
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  botonNueva: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-end",
    marginBottom: 14,
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
  badgeAlDia: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  badgeAtrasada: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  badgeCumplida: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextAlDia: {
    color: "#34D399",
  },
  badgeTextAtrasada: {
    color: "#F87171",
  },
  badgeTextCumplida: {
    color: "#60A5FA",
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
  seguimientoBox: {
    marginTop: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  seguimientoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  filaInferior: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  botonHistorial: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botonHistorialTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
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
  aportesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  aportesTitulo: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  aporteItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  aporteItemFecha: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  aporteItemMonto: {
    color: colors.success,
    fontWeight: "600",
    fontSize: 12,
  },
  aporteItemTextoVacio: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 4,
  },
});
