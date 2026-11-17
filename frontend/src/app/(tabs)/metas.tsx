import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { obtenerMetasAPI, actualizarOrigenAporteAPI } from "@/services/api";
import { formatearFechaCO } from "@/utils/date";
import { obtenerOrigenesAportesLocal } from "@/utils/aportesOrigen";

type Aporte = {
  id: string;
  valor: number;
  fecha_aporte: string;
  origen?: "saldo" | "externo";
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
  estado_seguimiento?: "cumplida" | "al_dia" | "atrasado" | "vencida" | "por_vencer";
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
    const origenesLocal = await obtenerOrigenesAportesLocal();

    try {
      // 1. Cargar a través de la API REST de FastAPI (con métricas algorítmicas de seguimiento)
      const metasAPI = await obtenerMetasAPI();
      if (Array.isArray(metasAPI)) {
        setMetas(
          metasAPI.map((m: any) => ({
            ...m,
            aportado: Number(m.total_ahorrado ?? 0),
            aportes: Array.isArray(m.aportes)
              ? m.aportes.map((a: any) => ({
                  ...a,
                  origen: a.origen || origenesLocal[String(a.id)] || "saldo",
                }))
              : [],
          }))
        );
        setCargando(false);
        setRefrescando(false);
        return;
      }
    } catch {
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
        origen: origenesLocal[String(a.id)] || "saldo",
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

  function handleEliminarMeta(meta: Meta) {
    const ejecutarBorrado = async () => {
      const { error } = await supabase.from("metas").delete().eq("id", meta.id);
      if (!error) {
        cargar();
      } else {
        if (Platform.OS === "web") {
          window.alert("No se pudo eliminar la meta: " + error.message);
        } else {
          Alert.alert("Error", "No se pudo eliminar la meta.");
        }
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `¿Eliminar la meta "${meta.nombre}" y sus aportes registrados?`
        )
      ) {
        ejecutarBorrado();
      }
    } else {
      Alert.alert(
        "Eliminar meta",
        `¿Eliminar la meta "${meta.nombre}" y sus aportes registrados?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: ejecutarBorrado },
        ]
      );
    }
  }

  async function handleToggleOrigenAporte(metaId: string, aporte: Aporte) {
    const nuevoOrigen = aporte.origen === "externo" ? "saldo" : "externo";
    await actualizarOrigenAporteAPI(metaId, aporte.id, nuevoOrigen);
    await cargar();
  }

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
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
              Aún no tienes metas de ahorro registradas. Crea tu primera meta con el botón de arriba.
            </Text>
          }
          renderItem={({ item }) => {
            const aportado = item.total_ahorrado ?? item.aportado ?? 0;
            const objetivo = Number(item.valor_objetivo);
            const progreso = objetivo > 0 ? Math.min(aportado / objetivo, 1) : 0;
            const esCumplida = item.estado === "cumplido" || progreso >= 1;

            // Cálculo local de días restantes para consistencia inmediata
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaObj = new Date(item.fecha_objetivo + "T00:00:00");
            const diasRestantes = Math.ceil(
              (fechaObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
            );

            let estadoSeg = item.estado_seguimiento;
            if (!estadoSeg) {
              if (esCumplida) estadoSeg = "cumplida";
              else if (diasRestantes <= 0) estadoSeg = "vencida";
              else if (diasRestantes <= 7 && progreso < 0.95) estadoSeg = "por_vencer";
              else estadoSeg = "al_dia";
            } else if (!esCumplida && diasRestantes <= 7 && progreso < 0.95) {
              estadoSeg = "por_vencer";
            }

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
                        : estadoSeg === "vencida"
                        ? styles.badgeVencida
                        : estadoSeg === "por_vencer"
                        ? styles.badgePorVencer
                        : estadoSeg === "atrasado"
                        ? styles.badgeAtrasada
                        : styles.badgeAlDia,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        esCumplida
                          ? styles.badgeTextCumplida
                          : estadoSeg === "vencida"
                          ? styles.badgeTextVencida
                          : estadoSeg === "por_vencer"
                          ? styles.badgeTextPorVencer
                          : estadoSeg === "atrasado"
                          ? styles.badgeTextAtrasada
                          : styles.badgeTextAlDia,
                      ]}
                    >
                      {esCumplida
                        ? "Cumplida"
                        : estadoSeg === "vencida"
                        ? "Plazo vencido"
                        : estadoSeg === "por_vencer"
                        ? `Por vencer (${Math.max(0, diasRestantes)}d)`
                        : estadoSeg === "atrasado"
                        ? "Atrasada"
                        : "Al día"}
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

                {/* Alerta Destacada si está Por Vencer */}
                {!esCumplida && estadoSeg === "por_vencer" && (
                  <View style={styles.avisoPorVencerBox}>
                    <Text style={styles.avisoPorVencerTitulo}>
                      Atención: Plazo crítico para cumplir la meta
                    </Text>
                    <Text style={styles.avisoPorVencerTexto}>
                      Restan solo {Math.max(0, diasRestantes)} días (límite: {formatearFechaCO(item.fecha_objetivo)}) y aún falta reunir ${(objetivo - aportado).toLocaleString("es-CO")}. Se requiere acelerar los aportes para alcanzar el objetivo.
                    </Text>
                  </View>
                )}

                {/* Panel de Seguimiento Temporal y Cuota */}
                {!esCumplida && (
                  <View style={styles.seguimientoBox}>
                    <Text style={styles.seguimientoTexto}>
                      {item.mensaje_seguimiento ||
                        (estadoSeg === "por_vencer"
                          ? `Restan ${Math.max(0, diasRestantes)} días para la fecha objetivo.`
                          : "Mantén tus aportes programados para cumplir tu meta a tiempo.")}
                    </Text>

                    {item.cuota_sugerida !== undefined && (
                      <Text style={[styles.seguimientoTexto, { marginTop: 4, fontWeight: "600" }]}>
                        Cuota sugerida: ${Math.round(item.cuota_sugerida).toLocaleString("es-CO")} /{" "}
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

                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    {/* Botón discreto para eliminar meta */}
                    <TouchableOpacity
                      onPress={() => handleEliminarMeta(item)}
                      style={styles.botonEliminar}
                      accessibilityLabel="Eliminar meta"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Botón para ver historial normal de aportes */}
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
                    <View style={styles.aportesHeaderRow}>
                      <Text style={styles.aportesTitulo}>Historial de Aportes</Text>
                      {item.aportes && item.aportes.length > 0 && (
                        <Text style={styles.aportesTip}>
                          Toca la etiqueta para cambiar origen
                        </Text>
                      )}
                    </View>
                    {!item.aportes || item.aportes.length === 0 ? (
                      <Text style={styles.aporteItemTextoVacio}>
                        Aún no has registrado ningún abono para esta meta.
                      </Text>
                    ) : (
                      item.aportes.map((a) => {
                        const esExterno = a.origen === "externo";
                        return (
                          <View key={a.id} style={styles.aporteItemRow}>
                            <View style={styles.aporteLeft}>
                              <Text style={styles.aporteItemFecha}>
                                {formatearFechaCO(a.fecha_aporte)}
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleToggleOrigenAporte(item.id, a)}
                                style={[
                                  styles.origenPill,
                                  esExterno
                                    ? styles.origenPillExterno
                                    : styles.origenPillSaldo,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.origenPillTexto,
                                    esExterno
                                      ? styles.origenPillTextoExterno
                                      : styles.origenPillTextoSaldo,
                                  ]}
                                >
                                  {esExterno ? "Ahorro previo" : "Desde saldo"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.aporteItemMonto}>
                              + ${Number(a.valor).toLocaleString("es-CO")}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: Platform.OS === "web" ? 32 : 60,
  },
  innerContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
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
  badgePorVencer: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  badgeVencida: {
    backgroundColor: "rgba(100, 116, 139, 0.2)",
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
  badgeTextPorVencer: {
    color: "#FBBF24",
  },
  badgeTextVencida: {
    color: "#94A3B8",
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
  avisoPorVencerBox: {
    marginTop: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  avisoPorVencerTitulo: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  avisoPorVencerTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
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
  botonEliminar: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
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
  aportesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  aportesTitulo: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  aportesTip: {
    color: colors.textSecondary,
    fontSize: 10,
    fontStyle: "italic",
  },
  aporteItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  aporteLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aporteItemFecha: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  origenPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  origenPillSaldo: {
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderColor: "rgba(20, 184, 166, 0.35)",
  },
  origenPillExterno: {
    backgroundColor: "rgba(99, 102, 241, 0.14)",
    borderColor: "rgba(129, 140, 248, 0.45)",
  },
  origenPillTexto: {
    fontSize: 10,
    fontWeight: "700",
  },
  origenPillTextoSaldo: {
    color: colors.success,
  },
  origenPillTextoExterno: {
    color: "#A5B4FC",
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
