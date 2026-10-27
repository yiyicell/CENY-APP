import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors } from "@/constants/theme";
import { supabase } from "@/constants/supabase";

export default function ReportesScreen() {
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [gastosAlta, setGastosAlta] = useState(0);
  const [gastosMediaBaja, setGastosMediaBaja] = useState(0);

  useFocusEffect(
    useCallback(() => {
      cargarReporte();
    }, [])
  );

  async function cargarReporte() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Obtener ingresos
    const { data: ingresos } = await supabase
      .from("ingresos")
      .select("valor");
    const ingTotal = (ingresos || []).reduce((acc, i) => acc + Number(i.valor), 0);
    setTotalIngresos(ingTotal);

    // Obtener gastos con categoría
    const { data: gastos } = await supabase
      .from("gastos")
      .select("valor, categorias(prioridad)");
    
    let gAlta = 0;
    let gMediaBaja = 0;
    let gTotal = 0;

    (gastos || []).forEach((g: any) => {
      const v = Number(g.valor);
      gTotal += v;
      const prio = g.categorias?.prioridad;
      if (prio === "alta") {
        gAlta += v;
      } else {
        gMediaBaja += v;
      }
    });

    setTotalGastos(gTotal);
    setGastosAlta(gAlta);
    setGastosMediaBaja(gMediaBaja);
  }

  const saldoDisponible = totalIngresos - totalGastos;
  const target50 = totalIngresos * 0.5;
  const target30 = totalIngresos * 0.3;
  const target20 = totalIngresos * 0.2;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Regla 50 / 30 / 20</Text>
      <Text style={styles.subtitulo}>Distribución financiera recomendada para tus ingresos</Text>

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

      {/* Bloque 50% - Necesidades */}
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

      {/* Bloque 30% - Deseos */}
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

      {/* Bloque 20% - Ahorro */}
      <View style={styles.seccionCard}>
        <View style={styles.headerSeccion}>
          <Text style={styles.seccionTitulo}>20% Ahorro e Inversión</Text>
          <Text style={styles.seccionMonto}>Meta recomendada: ${target20.toLocaleString("es-CO")}</Text>
        </View>
        <Text style={styles.seccionDesc}>
          Fondo de emergencia, aportes a tus metas activas y ahorro a largo plazo.
        </Text>
        <View style={styles.barraFondo}>
          <View
            style={[
              styles.barraProgreso,
              {
                width: `${Math.min(100, target20 > 0 && saldoDisponible > 0 ? (saldoDisponible / target20) * 100 : 0)}%`,
                backgroundColor: colors.success,
              },
            ]}
          />
        </View>
      </View>

      {/* Consejo de la regla */}
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

      <View style={{ height: 40 }} />
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
    marginBottom: 20,
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
  seccionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    marginTop: 8,
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
