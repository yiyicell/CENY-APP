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
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { obtenerMetasAPI } from "@/services/api";
import { formatearFechaCO } from "@/utils/date";
import {
  HistorialMetaCaretaker,
  MetaAhorroMemento,
  EstadoMeta,
} from "@/patterns/HistorialMetaCaretaker";

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
  estado_seguimiento?:
    | "cumplida"
    | "al_dia"
    | "atrasado"
    | "vencida"
    | "por_vencer"
    | "cancelada";
  mensaje_seguimiento?: string;
  estado_memento?: string;
  cantidad_mementos?: number;
  aportes?: Aporte[];
};

function formatearFechaHoraCO(fecha: Date): string {
  if (isNaN(fecha.getTime())) return "-";
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

export default function MetasScreen() {
  const router = useRouter();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [metaExpandida, setMetaExpandida] = useState<string | null>(null);
  const [tabHistorial, setTabHistorial] = useState<"aportes" | "mementos">("aportes");
  const [mementosPorMeta, setMementosPorMeta] = useState<
    Record<string, MetaAhorroMemento[]>
  >({});
  const [cargandoMementos, setCargandoMementos] = useState(false);
  const [procesandoMemento, setProcesandoMemento] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setCargando(true);
    try {
      // 1. Cargar a través de la API REST de FastAPI (con métricas y conteo de Mementos)
      const metasAPI = await obtenerMetasAPI();
      if (Array.isArray(metasAPI)) {
        setMetas(
          metasAPI.map((m: any) => ({
            ...m,
            aportado: Number(m.total_ahorrado ?? 0),
          }))
        );
        if (metaExpandida && tabHistorial === "mementos") {
          await cargarHistorialMementos(metaExpandida);
        }
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

  async function cargarHistorialMementos(metaId: string) {
    setCargandoMementos(true);
    try {
      const caretaker = new HistorialMetaCaretaker(metaId);
      const lista = await caretaker.cargarHistorial();
      setMementosPorMeta((prev) => ({ ...prev, [metaId]: lista }));
    } catch {
      // Si el servidor local no está activo, mantener vacío
    } finally {
      setCargandoMementos(false);
    }
  }

  function toggleExpandir(id: string) {
    const nuevoEstado = metaExpandida === id ? null : id;
    setMetaExpandida(nuevoEstado);
    if (nuevoEstado) {
      cargarHistorialMementos(nuevoEstado);
    }
  }

  function mostrarAlerta(titulo: string, mensaje: string) {
    if (Platform.OS === "web") {
      window.alert(`${titulo}\n\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  }

  function confirmarAccion(titulo: string, mensaje: string, onConfirm: () => void) {
    if (Platform.OS === "web") {
      if (window.confirm(`${titulo}\n\n${mensaje}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(titulo, mensaje, [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: onConfirm },
      ]);
    }
  }

  async function handleDeshacer(meta: Meta) {
    confirmarAccion(
      "Deshacer último cambio (Memento)",
      `¿Deseas restaurar la meta "${meta.nombre}" a su estado inmediatamente anterior?`,
      async () => {
        setProcesandoMemento(meta.id);
        try {
          const caretaker = new HistorialMetaCaretaker(meta.id);
          const res = await caretaker.deshacer();
          await cargar();
          await cargarHistorialMementos(meta.id);
          mostrarAlerta("Estado Restaurado", res.mensaje);
        } catch (err: any) {
          mostrarAlerta(
            "No fue posible deshacer",
            err.message || "Asegúrate de tener el servidor backend iniciado y al menos un estado previo guardado."
          );
        } finally {
          setProcesandoMemento(null);
        }
      }
    );
  }

  async function handleGuardarSnapshot(meta: Meta) {
    setProcesandoMemento(meta.id);
    try {
      const caretaker = new HistorialMetaCaretaker(meta.id);
      await caretaker.guardarSnapshot("Punto de control manual");
      await cargar();
      await cargarHistorialMementos(meta.id);
      mostrarAlerta(
        "Snapshot Guardado",
        `Se guardó una fotografía del estado actual de "${meta.nombre}" en el historial Memento.`
      );
    } catch (err: any) {
      mostrarAlerta(
        "Error al guardar snapshot",
        err.message || "No fue posible conectar con el servidor backend."
      );
    } finally {
      setProcesandoMemento(null);
    }
  }

  async function handleRestaurarIndice(meta: Meta, index: number) {
    confirmarAccion(
      `Restaurar al Snapshot #${index + 1}`,
      `Esto devolverá la meta "${meta.nombre}" al monto y estado guardados en ese punto del historial. ¿Continuar?`,
      async () => {
        setProcesandoMemento(meta.id);
        try {
          const caretaker = new HistorialMetaCaretaker(meta.id);
          const res = await caretaker.restaurarEnIndice(index);
          await cargar();
          await cargarHistorialMementos(meta.id);
          mostrarAlerta("Meta Restaurada", res.mensaje);
        } catch (err: any) {
          mostrarAlerta("Error al restaurar", err.message || "No se pudo restaurar el snapshot.");
        } finally {
          setProcesandoMemento(null);
        }
      }
    );
  }

  async function handleCambiarEstado(meta: Meta, nuevoEstado: EstadoMeta) {
    const etiqueta = nuevoEstado === EstadoMeta.CANCELADA ? "cancelar" : "reanudar";
    confirmarAccion(
      `${nuevoEstado === EstadoMeta.CANCELADA ? "Cancelar" : "Reanudar"} Meta`,
      `Se guardará un snapshot previo en Memento antes de ${etiqueta} la meta "${meta.nombre}". ¿Continuar?`,
      async () => {
        setProcesandoMemento(meta.id);
        try {
          const caretaker = new HistorialMetaCaretaker(meta.id);
          await caretaker.cambiarEstado(nuevoEstado);
          await cargar();
          await cargarHistorialMementos(meta.id);
        } catch (err: any) {
          mostrarAlerta("Error al cambiar estado", err.message || "No fue posible actualizar el estado.");
        } finally {
          setProcesandoMemento(null);
        }
      }
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metas y Seguimiento</Text>
      <Text style={styles.subtitulo}>
        Control de objetivos, historial de estados (Patrón Memento) y aportes
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
            const esCancelada =
              item.estado === "no_cumplido" || item.estado_seguimiento === "cancelada";
            const esCumplida =
              !esCancelada && (item.estado === "cumplido" || progreso >= 1);

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaObj = new Date(item.fecha_objetivo + "T00:00:00");
            const diasRestantes = Math.ceil(
              (fechaObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
            );

            let estadoSeg = item.estado_seguimiento;
            if (!estadoSeg) {
              if (esCancelada) estadoSeg = "cancelada";
              else if (esCumplida) estadoSeg = "cumplida";
              else if (diasRestantes <= 0) estadoSeg = "vencida";
              else if (diasRestantes <= 7 && progreso < 0.95) estadoSeg = "por_vencer";
              else estadoSeg = "al_dia";
            } else if (!esCumplida && !esCancelada && diasRestantes <= 7 && progreso < 0.95) {
              estadoSeg = "por_vencer";
            }

            const expandida = metaExpandida === item.id;
            const cantMementos =
              item.cantidad_mementos ?? (item.aportes ? item.aportes.length : 0);
            const listaMementos = mementosPorMeta[item.id] ?? [];
            const ocupado = procesandoMemento === item.id;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.nombre}>{item.nombre}</Text>

                  {/* Badge de Seguimiento Inteligente */}
                  <View
                    style={[
                      styles.badge,
                      esCancelada
                        ? styles.badgeVencida
                        : esCumplida
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
                        esCancelada
                          ? styles.badgeTextVencida
                          : esCumplida
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
                      {esCancelada
                        ? "Cancelada"
                        : esCumplida
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
                      esCancelada && { backgroundColor: "#64748B" },
                    ]}
                  />
                </View>

                {/* Alerta Destacada si está Por Vencer */}
                {!esCumplida && !esCancelada && estadoSeg === "por_vencer" && (
                  <View style={styles.avisoPorVencerBox}>
                    <Text style={styles.avisoPorVencerTitulo}>
                      Atención: Plazo crítico para cumplir la meta
                    </Text>
                    <Text style={styles.avisoPorVencerTexto}>
                      Restan solo {Math.max(0, diasRestantes)} días (límite:{" "}
                      {formatearFechaCO(item.fecha_objetivo)}) y aún falta reunir $
                      {(objetivo - aportado).toLocaleString("es-CO")}. Se requiere acelerar
                      los aportes para alcanzar el objetivo.
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

                    {!esCancelada && item.cuota_sugerida !== undefined && (
                      <Text
                        style={[styles.seguimientoTexto, { marginTop: 4, fontWeight: "600" }]}
                      >
                        Cuota sugerida: $
                        {Math.round(item.cuota_sugerida).toLocaleString("es-CO")} /{" "}
                        {item.frecuencia_ahorro ?? "mes"} ({item.periodos_restantes ?? 1}{" "}
                        período(s) restantes)
                      </Text>
                    )}
                  </View>
                )}

                {/* Fila Inferior con Fecha en formato colombiano y acciones */}
                <View style={styles.filaInferior}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {Math.round(progreso * 100)}% · Límite:{" "}
                    {formatearFechaCO(item.fecha_objetivo)}
                  </Text>

                  <View style={styles.accionesFila}>
                    {cantMementos > 0 && (
                      <TouchableOpacity
                        onPress={() => handleDeshacer(item)}
                        disabled={ocupado}
                        style={styles.botonDeshacer}
                      >
                        <Text style={styles.botonDeshacerTexto}>
                          {ocupado ? "..." : "Deshacer"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => toggleExpandir(item.id)}
                      style={styles.botonHistorial}
                    >
                      <Text style={styles.botonHistorialTexto}>
                        {expandida ? "Ocultar" : "Historial"}
                      </Text>
                    </TouchableOpacity>

                    {!esCumplida && !esCancelada && (
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

                {/* Desglose desplegable: Aportes & Historial Memento */}
                {expandida && (
                  <View style={styles.aportesContainer}>
                    <View style={styles.subTabsRow}>
                      <TouchableOpacity
                        onPress={() => setTabHistorial("aportes")}
                        style={[
                          styles.subTabBtn,
                          tabHistorial === "aportes" && styles.subTabBtnActivo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.subTabTexto,
                            tabHistorial === "aportes" && styles.subTabTextoActivo,
                          ]}
                        >
                          Aportes ({item.aportes?.length ?? 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setTabHistorial("mementos");
                          cargarHistorialMementos(item.id);
                        }}
                        style={[
                          styles.subTabBtn,
                          tabHistorial === "mementos" && styles.subTabBtnActivo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.subTabTexto,
                            tabHistorial === "mementos" && styles.subTabTextoActivo,
                          ]}
                        >
                          Estados Memento ({listaMementos.length || cantMementos})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {tabHistorial === "aportes" ? (
                      !item.aportes || item.aportes.length === 0 ? (
                        <Text style={styles.aporteItemTextoVacio}>
                          Aún no has registrado ningún abono para esta meta.
                        </Text>
                      ) : (
                        item.aportes.map((a) => (
                          <View key={a.id} style={styles.aporteItemRow}>
                            <Text style={styles.aporteItemFecha}>
                              {formatearFechaCO(a.fecha_aporte)}
                            </Text>
                            <Text style={styles.aporteItemMonto}>
                              + ${Number(a.valor).toLocaleString("es-CO")}
                            </Text>
                          </View>
                        ))
                      )
                    ) : (
                      <View>
                        <View style={styles.mementoToolbar}>
                          <TouchableOpacity
                            onPress={() => handleGuardarSnapshot(item)}
                            disabled={ocupado}
                            style={styles.btnSnapshot}
                          >
                            <Text style={styles.btnSnapshotTexto}>
                              + Guardar Snapshot
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              handleCambiarEstado(
                                item,
                                esCancelada
                                  ? EstadoMeta.EN_PROGRESO
                                  : EstadoMeta.CANCELADA
                              )
                            }
                            disabled={ocupado}
                            style={styles.btnEstadoToggle}
                          >
                            <Text style={styles.btnEstadoToggleTexto}>
                              {esCancelada ? "Reanudar meta" : "Cancelar meta"}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {cargandoMementos ? (
                          <Text style={styles.aporteItemTextoVacio}>
                            Cargando snapshots...
                          </Text>
                        ) : listaMementos.length === 0 ? (
                          <Text style={styles.aporteItemTextoVacio}>
                            Sin snapshots previos. Cada abono o cambio de estado guarda
                            automáticamente un Memento restaurable.
                          </Text>
                        ) : (
                          [...listaMementos]
                            .map((mem, idx) => ({ mem, idx }))
                            .reverse()
                            .map(({ mem, idx }) => (
                              <View key={mem.getId() || idx} style={styles.mementoRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={styles.mementoTitulo}>
                                    #{idx + 1} · $
                                    {mem.getMontoActual().toLocaleString("es-CO")} (
                                    {mem.getEstado()})
                                  </Text>
                                  <Text style={styles.mementoSub}>
                                    {formatearFechaHoraCO(mem.getFechaRegistro())} ·{" "}
                                    {mem.getNota()}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleRestaurarIndice(item, idx)}
                                  disabled={ocupado}
                                  style={styles.btnRestaurarItem}
                                >
                                  <Text style={styles.btnRestaurarItemTexto}>
                                    Restaurar
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ))
                        )}
                      </View>
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
    flexWrap: "wrap",
    gap: 8,
  },
  accionesFila: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  botonDeshacer: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botonDeshacerTexto: {
    color: "#FBBF24",
    fontWeight: "700",
    fontSize: 12,
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
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 12,
  },
  botonAbonar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botonAbonarTexto: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  aportesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  subTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subTabBtnActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subTabTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  subTabTextoActivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  aporteItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  aporteItemFecha: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  aporteItemMonto: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  aporteItemTextoVacio: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  mementoToolbar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  btnSnapshot: {
    flex: 1,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSnapshotTexto: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  btnEstadoToggle: {
    backgroundColor: "rgba(148, 163, 184, 0.14)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnEstadoToggleTexto: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  mementoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  mementoTitulo: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  mementoSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  btnRestaurarItem: {
    backgroundColor: "rgba(124, 77, 255, 0.18)",
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  btnRestaurarItemTexto: {
    color: "#C4B5FD",
    fontSize: 11,
    fontWeight: "700",
  },
});
