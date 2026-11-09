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
  exportarExcelXLSX,
  exportarPDF,
} from "@/utils/export";

type TabReporte = "distribucion" | "presupuesto" | "auditoria";

const COLORES_CATEGORIAS: Record<string, string> = {
  Alimentación: "#10B981",
  Transporte: "#3B82F6",
  Vivienda: "#6366F1",
  Salud: "#EC4899",
  Ocio: "#F59E0B",
  Otros: "#64748B",
};

export default function ReportesScreen() {
  const [tabActiva, setTabActiva] = useState<TabReporte>("distribucion");
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
      // Continuar con fallback local si el backend no responde
    }

    // Preparar objeto para exportación
    const saldoNetoSeguro = Math.max(0, ingTotal - gTotal);
    const datosExp: DatosExportacion = {
      usuarioNombre: usuario?.nombre || "Usuario",
      totalIngresos: ingTotal,
      totalGastos: gTotal,
      saldoDisponible: saldoNetoSeguro,
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

  async function handleExportarExcel() {
    if (!datosExportar) return;
    setExportando(true);
    try {
      await exportarExcelXLSX(datosExportar);
      if (Platform.OS === "web") {
        Alert.alert("Descarga Completa", "El libro de calculo Excel (.xlsx) ha sido generado exitosamente.");
      }
    } catch (e: any) {
      Alert.alert("Error en exportacion", e.message || "No fue posible generar el archivo Excel");
    } finally {
      setExportando(false);
    }
  }

  async function handleExportarPDF() {
    if (!datosExportar) return;
    setExportando(true);
    try {
      await exportarPDF(datosExportar);
    } catch (e: any) {
      Alert.alert("Error en exportacion", e.message || "No fue posible generar el documento PDF");
    } finally {
      setExportando(false);
    }
  }

  // Saldo neto (nunca negativo en interfaz si no hay fondos)
  const saldoNeto = Math.max(0, totalIngresos - totalGastos);
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
      <Text style={styles.title}>Informe Financiero y Analítica</Text>
      <Text style={styles.subtitulo}>
        Evaluación patrimonial, auditoría algorítmica y gráficas de control
      </Text>

      {/* Pestañas Segmentadas para Descongestionar la Pantalla */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setTabActiva("distribucion")}
          style={[styles.tabBtn, tabActiva === "distribucion" && styles.tabBtnActivo]}
        >
          <Text
            style={[
              styles.tabBtnTexto,
              tabActiva === "distribucion" && styles.tabBtnTextoActivo,
            ]}
          >
            Gráficas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTabActiva("presupuesto")}
          style={[styles.tabBtn, tabActiva === "presupuesto" && styles.tabBtnActivo]}
        >
          <Text
            style={[
              styles.tabBtnTexto,
              tabActiva === "presupuesto" && styles.tabBtnTextoActivo,
            ]}
          >
            Regla 50/30/20
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTabActiva("auditoria")}
          style={[styles.tabBtn, tabActiva === "auditoria" && styles.tabBtnActivo]}
        >
          <Text
            style={[
              styles.tabBtnTexto,
              tabActiva === "auditoria" && styles.tabBtnTextoActivo,
            ]}
          >
            Fugas & Exportar
          </Text>
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* 1. VISTA: DISTRIBUCIÓN Y GRÁFICAS                        */}
      {/* ======================================================== */}
      {tabActiva === "distribucion" && (
        <View>
          {/* Resumen Global de Balance */}
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
              <Text style={styles.resumenLabel}>Saldo Neto</Text>
              <Text
                style={[
                  styles.resumenValor,
                  saldoNeto === 0 ? { color: colors.textSecondary } : { color: colors.textPrimary },
                ]}
              >
                ${saldoNeto.toLocaleString("es-CO")}
              </Text>
            </View>
          </View>

          {/* Gráfica de Torta SVG y Ranking por Categorías */}
          <GraficasFinancieras
            totalIngresos={totalIngresos}
            totalGastos={totalGastos}
            gastosAlta={gastosAlta}
            gastosMediaBaja={gastosMediaBaja}
            categoriasDesglose={categoriasDesglose}
            mostrarRegla503020={false}
          />

          {/* Diagnóstico Ejecutivo Conciso */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitulo}>Diagnóstico Financiero Consolidado</Text>
            <Text style={styles.tipText}>
              {totalIngresos === 0
                ? "No se registran ingresos en el período. Ingresa tus fuentes de ingreso para activar los límites de ahorro y proyecciones de gasto."
                : totalGastos > totalIngresos
                ? "El total de egresos consolidados supera los ingresos percibidos. Se sugiere revisar compras discrecionales en las categorías de mayor volumen."
                : totalGastos > totalIngresos * 0.8
                ? "El consumo actual supera el 80% de tus ingresos. Se recomienda moderar salidas en ocio para salvaguardar tu capacidad de ahorro."
                : "La ejecución presupuestal se mantiene en márgenes saludables, permitiendo canalizar excedentes hacia tus metas activas."}
            </Text>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* 2. VISTA: REGLA 50/30/20 & PROYECCIÓN                    */}
      {/* ======================================================== */}
      {tabActiva === "presupuesto" && (
        <View>
          {/* Tarjeta 50% Necesidades Básicas */}
          <View style={styles.seccionCard}>
            <View style={styles.headerSeccion}>
              <Text style={styles.seccionTitulo}>50% Necesidades Básicas</Text>
              <Text
                style={[
                  styles.seccionMonto,
                  gastosAlta > target50 && target50 > 0 ? { color: colors.danger } : {},
                ]}
              >
                ${gastosAlta.toLocaleString("es-CO")} / ${target50.toLocaleString("es-CO")}
              </Text>
            </View>
            <Text style={styles.seccionDesc}>
              Egresos fundamentales: alimentación, vivienda, transporte y salud (Prioridad alta).
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

          {/* Tarjeta 30% Deseos */}
          <View style={styles.seccionCard}>
            <View style={styles.headerSeccion}>
              <Text style={styles.seccionTitulo}>30% Deseos y Consumo Discrecional</Text>
              <Text
                style={[
                  styles.seccionMonto,
                  gastosMediaBaja > target30 && target30 > 0 ? { color: colors.danger } : { color: "#F59E0B" },
                ]}
              >
                ${gastosMediaBaja.toLocaleString("es-CO")} / ${target30.toLocaleString("es-CO")}
              </Text>
            </View>
            <Text style={styles.seccionDesc}>
              Egresos flexibles: ocio, entretenimiento, suscripciones y compras secundarias (Prioridad media y baja).
            </Text>
            <View style={styles.barraFondo}>
              <View
                style={[
                  styles.barraProgreso,
                  {
                    width: `${Math.min(100, target30 > 0 ? (gastosMediaBaja / target30) * 100 : 0)}%`,
                    backgroundColor: gastosMediaBaja > target30 ? colors.danger : "#F59E0B",
                  },
                ]}
              />
            </View>
          </View>

          {/* Tarjeta 20% Ahorro */}
          <View style={styles.seccionCard}>
            <View style={styles.headerSeccion}>
              <Text style={styles.seccionTitulo}>20% Ahorro e Inversión</Text>
              <Text style={[styles.seccionMonto, { color: colors.success }]}>
                ${saldoNeto.toLocaleString("es-CO")} / ${target20.toLocaleString("es-CO")}
              </Text>
            </View>
            <Text style={styles.seccionDesc}>
              Reserva de capital, amortización prioritaria y abono programado a metas de ahorro.
            </Text>
            <View style={styles.barraFondo}>
              <View
                style={[
                  styles.barraProgreso,
                  {
                    width: `${Math.min(
                      100,
                      target20 > 0 && saldoNeto > 0 ? (saldoNeto / target20) * 100 : 0
                    )}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
          </View>

          {/* Proyección Predictiva Mensual */}
          {infoProyeccion && totalIngresos > 0 && (
            <View style={styles.proyeccionCard}>
              <Text style={styles.proyeccionTitulo}>Proyección Predictiva de Ritmo de Consumo</Text>
              <Text style={styles.proyeccionDesc}>
                Gasto diario promedio actual:{" "}
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                  ${Math.round(infoProyeccion.promedio_diario).toLocaleString("es-CO")} / día
                </Text>
              </Text>
              <Text style={styles.proyeccionDesc}>
                Gasto proyectado al cierre de mes:{" "}
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
                  ? `Alerta Predictiva: Al ritmo actual se registrará un déficit estimado de $${Math.round(
                      infoProyeccion.diferencia
                    ).toLocaleString("es-CO")}. Se recomienda moderar salidas prescindibles.`
                  : "Estado Predictivo Favorable: El ritmo de consumo proyectado se mantendrá por debajo de los ingresos previstos."}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ======================================================== */}
      {/* 3. VISTA: AUDITORÍA DE MICROGASTOS & EXPORTACIÓN          */}
      {/* ======================================================== */}
      {tabActiva === "auditoria" && (
        <View>
          {/* Tarjeta de Auditoría de Microgastos (Gastos Hormiga) */}
          <View style={styles.hormigaCard}>
            <View style={styles.hormigaHeader}>
              <Text style={styles.hormigaTitulo}>Auditoría de Microgastos (Gastos Hormiga)</Text>
              <Text style={styles.hormigaMonto}>
                ${Number(infoHormiga?.total || 0).toLocaleString("es-CO")}
              </Text>
            </View>
            <Text style={styles.hormigaTexto}>
              {infoHormiga && infoHormiga.total > 0
                ? `Se detectaron ${infoHormiga.cantidad} desembolsos menores clasificados algorítmicamente (montos <= $25.000 COP en conceptos no prioritarios).`
                : "No se registran gastos hormiga o microgastos atípicos en el período evaluado."}
            </Text>

            {infoHormiga && infoHormiga.total > 0 ? (
              <>
                <Text style={[styles.hormigaTexto, { marginTop: 8 }]}>
                  Impacto acumulado proyectado a un año:{" "}
                  <Text style={{ fontWeight: "700", color: "#F59E0B" }}>
                    ${Number(infoHormiga.proyeccion_anual).toLocaleString("es-CO")}
                  </Text>
                </Text>
                {infoHormiga.impacto_meta ? (
                  <View style={styles.hormigaMetaBox}>
                    <Text style={styles.hormigaMetaTexto}>
                      Aceleración de Ahorro: {infoHormiga.impacto_meta}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          {/* Módulo de Descarga Formal de Informes */}
          <View style={styles.exportarCard}>
            <Text style={styles.exportarTitulo}>Descarga de Informes Formales</Text>
            <Text style={styles.exportarDesc}>
              Genera documentos ejecutivos multi-hoja en formato Microsoft Excel (.xlsx) o informes maquetados en PDF con tablas consolidadas de auditoría patrimonial.
            </Text>

            <View style={styles.exportarFeaturesList}>
              <Text style={styles.exportarFeatureItem}>
                • Hoja de cálculo Excel (.xlsx): 4 pestañas (Resumen, Gastos, Ingresos, Metas).
              </Text>
              <Text style={styles.exportarFeatureItem}>
                • Documento PDF: Tablas de balance, auditoría de fugas y regla 50/30/20.
              </Text>
            </View>

            <View style={styles.exportarBtnRow}>
              <TouchableOpacity
                onPress={handleExportarExcel}
                disabled={exportando}
                style={[styles.btnExportar, { backgroundColor: "#10B981" }]}
              >
                <Text style={styles.btnExportarTexto}>
                  {exportando ? "Procesando..." : "Descargar Excel (.xlsx)"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExportarPDF}
                disabled={exportando}
                style={[styles.btnExportar, { backgroundColor: "#2563EB" }]}
              >
                <Text style={styles.btnExportarTexto}>
                  {exportando ? "Generando..." : "Descargar PDF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
    marginTop: 2,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActivo: {
    backgroundColor: colors.primary,
  },
  tabBtnTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  tabBtnTextoActivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cardResumen: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  resumenItem: {
    flex: 1,
    alignItems: "center",
  },
  resumenLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: "500",
  },
  resumenValor: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.cardBorder,
  },
  tipCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tipTitulo: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  seccionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerSeccion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  seccionTitulo: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  seccionMonto: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  seccionDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  barraFondo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },
  barraProgreso: {
    height: "100%",
    borderRadius: 4,
  },
  proyeccionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  proyeccionTitulo: {
    color: colors.textPrimary,
    fontSize: 14,
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
    lineHeight: 17,
    marginTop: 8,
    fontWeight: "600",
  },
  hormigaCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  hormigaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  hormigaTitulo: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  hormigaMonto: {
    color: "#F59E0B",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },
  hormigaTexto: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  hormigaMetaBox: {
    marginTop: 10,
    backgroundColor: "#F59E0B15",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B33",
  },
  hormigaMetaTexto: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  exportarCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  exportarTitulo: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  exportarDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  exportarFeaturesList: {
    marginBottom: 14,
    gap: 4,
  },
  exportarFeatureItem: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  exportarBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnExportar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnExportarTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});
