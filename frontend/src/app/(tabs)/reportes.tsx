import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { colors } from "@/constants/theme";
import { supabase } from "@/constants/supabase";
import { obtenerAnalisisAPI } from "@/services/api";
import { GraficasFinancieras, CategoriaDesglose } from "@/components/GraficasFinancieras";
import {
  DatosExportacion,
  exportarArchivoCSV,
  compartirResumen,
} from "@/utils/export";

const ICONOS_CATEGORIAS: Record<string, string> = {
  Alimentación: "🍽️",
  Transporte: "🚌",
  Vivienda: "🏠",
  Salud: "❤️",
  Ocio: "🎮",
  Otros: "📦",
};

const COLORES_CATEGORIAS: Record<string, string> = {
  Alimentación: "#10B981",
  Transporte: "#3B82F6",
  Vivienda: "#6366F1",
  Salud: "#EC4899",
  Ocio: "#F59E0B",
  Otros: "#6B7280",
};

export default function ReportesScreen() {
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [gastosAlta, setGastosAlta] = useState(0);
  const [gastosMediaBaja, setGastosMediaBaja] = useState(0);
  const [categoriasDesglose, setCategoriasDesglose] = useState<CategoriaDesglose[]>([]);
  const [datosExportar, setDatosExportar] = useState<DatosExportacion | null>(null);
  const [analisisAPI, setAnalisisAPI] = useState<any>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarReporte();
    }, [])
  );

  async function cargarReporte() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Obtener usuario
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("id", userData.user.id)
      .single();

    // Obtener ingresos
    const { data: ingresos } = await supabase
      .from("ingresos")
      .select("valor, fecha_ingreso, descripcion")
      .order("fecha_ingreso", { ascending: false });

    const ingTotal = (ingresos || []).reduce((acc, i) => acc + Number(i.valor), 0);
    setTotalIngresos(ingTotal);

    // Obtener gastos con categoría
    const { data: gastos } = await supabase
      .from("gastos")
      .select("valor, fecha_gasto, descripcion, categorias(nombre, prioridad)")
      .order("fecha_gasto", { ascending: false });

    let gAlta = 0;
    let gMediaBaja = 0;
    let gTotal = 0;
    const acumPorCat: Record<string, { total: number; prio: string }> = {};

    (gastos || []).forEach((g: any) => {
      const v = Number(g.valor);
      gTotal += v;
      const catNom = g.categorias?.nombre || "Otros";
      const prio = g.categorias?.prioridad || "media";

      if (prio === "alta") {
        gAlta += v;
      } else {
        gMediaBaja += v;
      }

      if (!acumPorCat[catNom]) {
        acumPorCat[catNom] = { total: 0, prio };
      }
      acumPorCat[catNom].total += v;
    });

    setTotalGastos(gTotal);
    setGastosAlta(gAlta);
    setGastosMediaBaja(gMediaBaja);

    // Desglose para gráficas
    const listaDesglose: CategoriaDesglose[] = Object.keys(acumPorCat).map((nom) => {
      const tot = acumPorCat[nom].total;
      const pct = gTotal > 0 ? Math.round((tot / gTotal) * 100) : 0;
      return {
        nombre: nom,
        total: tot,
        porcentaje: pct,
        color: COLORES_CATEGORIAS[nom] || "#8B5CF6",
        icono: ICONOS_CATEGORIAS[nom] || "💸",
        prioridad: acumPorCat[nom].prio,
      };
    });

    listaDesglose.sort((a, b) => b.total - a.total);
    setCategoriasDesglose(listaDesglose);

    // Obtener metas
    const { data: metas } = await supabase
      .from("metas")
      .select("nombre, valor_objetivo, fecha_objetivo, estado, id");

    const { data: aportes } = await supabase.from("aportes").select("meta_id, valor");
    const totalesAportes: Record<string, number> = {};
    (aportes || []).forEach((a) => {
      totalesAportes[a.meta_id] = (totalesAportes[a.meta_id] || 0) + Number(a.valor);
    });

    const metasFormateadas = (metas || []).map((m) => ({
      nombre: m.nombre,
      valor_objetivo: Number(m.valor_objetivo),
      aportado: totalesAportes[m.id] || 0,
      fecha_objetivo: m.fecha_objetivo,
      estado: m.estado,
    }));

    // Cargar análisis algorítmico y predictivo desde FastAPI
    let analisisBackend: any = null;
    try {
      analisisBackend = await obtenerAnalisisAPI();
      setAnalisisAPI(analisisBackend);
    } catch {
      // Ignorar fallback
    }

    // Preparar objeto para exportación
    const datosExp: DatosExportacion = {
      usuarioNombre: usuario?.nombre || "Usuario",
      totalIngresos: ingTotal,
      totalGastos: gTotal,
      saldoDisponible: ingTotal - gTotal,
      gastosAlta: gAlta,
      gastosMediaBaja: gMediaBaja,
      target50: ingTotal * 0.5,
      target30: ingTotal * 0.3,
      target20: ingTotal * 0.2,
      gastos: (gastos || []).map((g: any) => ({
        fecha: g.fecha_gasto,
        categoria: g.categorias?.nombre || "Otros",
        descripcion: g.descripcion,
        valor: Number(g.valor),
      })),
      ingresos: (ingresos || []).map((i: any) => ({
        fecha: i.fecha_ingreso,
        descripcion: i.descripcion,
        valor: Number(i.valor),
      })),
      metas: metasFormateadas,
      gastosHormigaTotal: analisisBackend?.gastos_hormiga?.total,
      proyeccionFinMes: analisisBackend?.proyeccion_mensual?.proyeccion_fin_mes,
    };

    setDatosExportar(datosExp);
    setRefrescando(false);
  }

  function onRefresh() {
    setRefrescando(true);
    cargarReporte();
  }

  async function handleExportarCSV() {
    if (!datosExportar) return;
    setExportando(true);
    try {
      await exportarArchivoCSV(datosExportar);
      if (Platform.OS === "web") {
        Alert.alert("Exportación completada", "El archivo CSV ha sido descargado correctamente.");
      }
    } catch (e: any) {
      Alert.alert("Error al exportar", e.message || "No se pudo generar el archivo");
    } finally {
      setExportando(false);
    }
  }

  async function handleCompartir() {
    if (!datosExportar) return;
    setExportando(true);
    try {
      await compartirResumen(datosExportar);
    } catch (e: any) {
      Alert.alert("Error al compartir", e.message || "No se pudo abrir el cuadro de compartir");
    } finally {
      setExportando(false);
    }
  }

  const saldoDisponible = totalIngresos - totalGastos;
  const target50 = totalIngresos * 0.5;
  const target30 = totalIngresos * 0.3;
  const target20 = totalIngresos * 0.2;

  const infoHormiga = analisisAPI?.gastos_hormiga;
  const infoProyeccion = analisisAPI?.proyeccion_mensual;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={onRefresh}
          tintColor={colors.success}
        />
      }
    >
      <Text style={styles.title}>Reportes Financieros</Text>
      <Text style={styles.subtitulo}>
        Análisis predictivo, regla 50/30/20 y gráficas interactivas
      </Text>

      {/* Resumen Global */}
      <View style={styles.cardResumen}>
        <View style={styles.resumenItem}>
          <Text style={styles.resumenLabel}>Ingresos</Text>
          <Text style={[styles.resumenValor, { color: colors.success }]}>
            ${totalIngresos.toLocaleString("es-CO")}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.resumenItem}>
          <Text style={styles.resumenLabel}>Gastos</Text>
          <Text style={[styles.resumenValor, { color: colors.danger }]}>
            ${totalGastos.toLocaleString("es-CO")}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.resumenItem}>
          <Text style={styles.resumenLabel}>Disponible</Text>
          <Text style={[styles.resumenValor, { color: colors.textPrimary }]}>
            ${saldoDisponible.toLocaleString("es-CO")}
          </Text>
        </View>
      </View>

      {/* Botones de Exportación (PDF / XLS / CSV) */}
      <View style={styles.exportarCard}>
        <Text style={styles.exportarTitulo}>📥 Exportar Reporte</Text>
        <Text style={styles.exportarDesc}>
          Descarga o comparte un informe completo con balance, metas y desglose de gastos.
        </Text>
        <View style={styles.exportarBtnRow}>
          <TouchableOpacity
            onPress={handleExportarCSV}
            disabled={exportando}
            style={[styles.btnExportar, { backgroundColor: "#10B981" }]}
          >
            <Text style={styles.btnExportarTexto}>
              {exportando ? "Generando..." : "📊 Exportar a Excel (CSV)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCompartir}
            disabled={exportando}
            style={[styles.btnExportar, { backgroundColor: "#6366F1" }]}
          >
            <Text style={styles.btnExportarTexto}>
              📄 Compartir / Imprimir PDF
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gráficas Visuales */}
      <GraficasFinancieras
        totalIngresos={totalIngresos}
        totalGastos={totalGastos}
        gastosAlta={gastosAlta}
        gastosMediaBaja={gastosMediaBaja}
        categoriasDesglose={categoriasDesglose}
        proyeccionFinMes={infoProyeccion?.proyeccion_fin_mes}
      />

      {/* Panel Algorítmico de Gastos Hormiga */}
      {infoHormiga && infoHormiga.total > 0 && (
        <View style={styles.hormigaCard}>
          <View style={styles.hormigaHeader}>
            <Text style={styles.hormigaTitulo}>🐜 Análisis de Gastos Hormiga</Text>
            <Text style={styles.hormigaMonto}>
              ${Number(infoHormiga.total).toLocaleString("es-CO")}
            </Text>
          </View>
          <Text style={styles.hormigaTexto}>
            Se han detectado {infoHormiga.cantidad} micro-gastos este período (cafés, snacks o compras menores).
          </Text>
          {infoHormiga.impacto_meta ? (
            <Text style={[styles.hormigaTexto, { color: "#F59E0B", fontWeight: "600", marginTop: 4 }]}>
              💡 {infoHormiga.impacto_meta}
            </Text>
          ) : (
            <Text style={[styles.hormigaTexto, { color: colors.textSecondary, marginTop: 4 }]}>
              Proyección anual: Si mantienes este ritmo, gastarás ${Number(infoHormiga.proyeccion_anual).toLocaleString("es-CO")} al año en micro-compras.
            </Text>
          )}
        </View>
      )}

      {/* Proyección Predictiva Mensual */}
      {infoProyeccion && totalIngresos > 0 && (
        <View style={styles.proyeccionCard}>
          <Text style={styles.proyeccionTitulo}>📈 Ritmo Predictivo de Gasto</Text>
          <Text style={styles.proyeccionDesc}>
            Gasto promedio diario:{" "}
            <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
              ${Math.round(infoProyeccion.promedio_diario).toLocaleString("es-CO")} / día
            </Text>
          </Text>
          <Text style={styles.proyeccionDesc}>
            Proyección a fin de mes:{" "}
            <Text
              style={{
                fontWeight: "700",
                color: infoProyeccion.excede_ingresos ? colors.danger : colors.success,
              }}
            >
              ${Math.round(infoProyeccion.proyeccion_fin_mes).toLocaleString("es-CO")}
            </Text>{" "}
            (de ${totalIngresos.toLocaleString("es-CO")} de ingresos)
          </Text>
          <Text
            style={[
              styles.proyeccionAlerta,
              { color: infoProyeccion.excede_ingresos ? "#F87171" : "#34D399" },
            ]}
          >
            {infoProyeccion.excede_ingresos
              ? `⚠️ Alerta: A este ritmo excederás tus ingresos por $${Math.round(
                  infoProyeccion.diferencia
                ).toLocaleString("es-CO")}. Reduce compras no esenciales.`
              : "✅ Tu ritmo de gasto actual es sostenible y te permitirá ahorrar."}
          </Text>
        </View>
      )}

      {/* Detalle Regla 50/30/20 */}
      <View style={styles.seccionCard}>
        <View style={styles.headerSeccion}>
          <Text style={styles.seccionTitulo}>50% Necesidades Básicas</Text>
          <Text style={styles.seccionMonto}>
            ${gastosAlta.toLocaleString("es-CO")} / ${target50.toLocaleString("es-CO")}
          </Text>
        </View>
        <Text style={styles.seccionDesc}>
          Alimentación, vivienda, servicios y salud (Categorías de prioridad alta).
        </Text>
        <View style={styles.barraFondo}>
          <View
            style={[
              styles.barraProgreso,
              {
                width: `${Math.min(100, target50 > 0 ? (gastosAlta / target50) * 100 : 0)}%`,
                backgroundColor: gastosAlta > target50 ? colors.danger : colors.primary,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.seccionCard}>
        <View style={styles.headerSeccion}>
          <Text style={styles.seccionTitulo}>30% Deseos y Estilo de Vida</Text>
          <Text style={styles.seccionMonto}>
            ${gastosMediaBaja.toLocaleString("es-CO")} / ${target30.toLocaleString("es-CO")}
          </Text>
        </View>
        <Text style={styles.seccionDesc}>
          Ocio, entretenimiento, salidas y compras secundarias (Prioridad media y baja).
        </Text>
        <View style={styles.barraFondo}>
          <View
            style={[
              styles.barraProgreso,
              {
                width: `${Math.min(100, target30 > 0 ? (gastosMediaBaja / target30) * 100 : 0)}%`,
                backgroundColor: gastosMediaBaja > target30 ? colors.danger : "#f59e0b",
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.seccionCard}>
        <View style={styles.headerSeccion}>
          <Text style={styles.seccionTitulo}>20% Ahorro e Inversión</Text>
          <Text style={styles.seccionMonto}>
            Meta recomendada: ${target20.toLocaleString("es-CO")}
          </Text>
        </View>
        <Text style={styles.seccionDesc}>
          Fondo de emergencia, aportes a tus metas activas y ahorro a largo plazo.
        </Text>
        <View style={styles.barraFondo}>
          <View
            style={[
              styles.barraProgreso,
              {
                width: `${Math.min(
                  100,
                  target20 > 0 && saldoDisponible > 0 ? (saldoDisponible / target20) * 100 : 0
                )}%`,
                backgroundColor: colors.success,
              },
            ]}
          />
        </View>
      </View>

      {/* Consejo Financiero */}
      <View style={styles.tipCard}>
        <Text style={styles.tipIcon}>💡 Consejo Financiero</Text>
        <Text style={styles.tipText}>
          {totalIngresos === 0
            ? "Registra tus ingresos mensuales para calcular tu presupuesto automático 50/30/20."
            : totalGastos > totalIngresos * 0.8
            ? "Tus gastos están superando el 80% de tus ingresos. Procura reducir compras no esenciales para no comprometer tus metas."
            : "¡Muy bien! Estás manteniendo tus gastos dentro del límite recomendado para garantizar tu cuota de ahorro."}
        </Text>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
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
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    marginTop: 4,
  },
  cardResumen: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  resumenItem: {
    flex: 1,
    alignItems: "center",
  },
  resumenLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  resumenValor: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.inputBorder,
  },
  exportarCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  exportarTitulo: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  exportarDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  exportarBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnExportar: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnExportarTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  hormigaCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  hormigaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  hormigaTitulo: {
    color: "#F59E0B",
    fontSize: 15,
    fontWeight: "700",
  },
  hormigaMonto: {
    color: "#F59E0B",
    fontSize: 16,
    fontWeight: "800",
  },
  hormigaTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  proyeccionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  proyeccionTitulo: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  proyeccionDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  proyeccionAlerta: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 16,
  },
  seccionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  headerSeccion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  seccionTitulo: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  seccionMonto: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  seccionDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  barraFondo: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barraProgreso: {
    height: "100%",
    borderRadius: 4,
  },
  tipCard: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    padding: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  tipIcon: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
