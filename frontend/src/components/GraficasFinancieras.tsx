import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

export type CategoriaDesglose = {
  nombre: string;
  total: number;
  porcentaje: number;
  color: string;
  icono: string;
  prioridad?: string;
};

type Props = {
  totalIngresos: number;
  totalGastos: number;
  gastosAlta: number;
  gastosMediaBaja: number;
  categoriasDesglose: CategoriaDesglose[];
  proyeccionFinMes?: number;
};

const PALETA_COLORES = [
  "#10B981", // verde esmeralda
  "#3B82F6", // azul
  "#F59E0B", // naranja
  "#EC4899", // rosa
  "#8B5CF6", // violeta
  "#6B7280", // gris
  "#06B6D4", // cian
];

export function GraficasFinancieras({
  totalIngresos,
  totalGastos,
  gastosAlta,
  gastosMediaBaja,
  categoriasDesglose,
  proyeccionFinMes,
}: Props) {
  const target50 = totalIngresos * 0.5;
  const target30 = totalIngresos * 0.3;
  const target20 = totalIngresos * 0.2;
  const saldoDisponible = totalIngresos - totalGastos;

  return (
    <View style={styles.container}>
      {/* 1. Gráfica de Distribución Continua (Stacked Bar) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Distribución Visual de Gastos</Text>
        <Text style={styles.cardSubtitle}>
          Proporción de tus gastos totales por categoría
        </Text>

        {totalGastos === 0 ? (
          <Text style={styles.emptyText}>No hay gastos registrados aún para graficar.</Text>
        ) : (
          <>
            <View style={styles.stackedBar}>
              {categoriasDesglose.map((cat, index) => {
                const ancho = Math.max(2, cat.porcentaje);
                return (
                  <View
                    key={cat.nombre}
                    style={{
                      width: `${ancho}%`,
                      backgroundColor: cat.color || PALETA_COLORES[index % PALETA_COLORES.length],
                      height: "100%",
                    }}
                  />
                );
              })}
            </View>

            {/* Leyenda de píldoras con porcentajes */}
            <View style={styles.legendContainer}>
              {categoriasDesglose.map((cat, index) => (
                <View key={cat.nombre} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: cat.color || PALETA_COLORES[index % PALETA_COLORES.length] },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {cat.icono} {cat.nombre} ({cat.porcentaje}%)
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* 2. Gráfica de Barras por Categoría */}
      {categoriasDesglose.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 Gastos por Categoría</Text>
          <Text style={styles.cardSubtitle}>Montos acumulados y porcentaje del total</Text>

          {categoriasDesglose.map((cat, index) => {
            const colorBarra = cat.color || PALETA_COLORES[index % PALETA_COLORES.length];
            return (
              <View key={cat.nombre} style={styles.categoriaBarraRow}>
                <View style={styles.categoriaBarraHeader}>
                  <Text style={styles.categoriaBarraNombre}>
                    {cat.icono} {cat.nombre}
                  </Text>
                  <Text style={styles.categoriaBarraMonto}>
                    ${cat.total.toLocaleString("es-CO")}{" "}
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      ({cat.porcentaje}%)
                    </Text>
                  </Text>
                </View>

                <View style={styles.barraFondo}>
                  <View
                    style={[
                      styles.barraProgreso,
                      { width: `${cat.porcentaje}%`, backgroundColor: colorBarra },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 3. Gráfica Comparativa 50/30/20 (Presupuesto vs Real) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚖️ Comparativa 50/30/20 (Meta vs Real)</Text>
        <Text style={styles.cardSubtitle}>
          ¿Cómo se comparan tus gastos frente a los límites recomendados?
        </Text>

        {/* 50% Necesidades */}
        <View style={styles.comparativaItem}>
          <View style={styles.comparativaHeader}>
            <Text style={styles.comparativaLabel}>50% Necesidades</Text>
            <Text
              style={[
                styles.comparativaEstado,
                gastosAlta > target50 ? { color: colors.danger } : { color: colors.success },
              ]}
            >
              ${gastosAlta.toLocaleString("es-CO")} / ${target50.toLocaleString("es-CO")}
            </Text>
          </View>
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

        {/* 30% Deseos */}
        <View style={styles.comparativaItem}>
          <View style={styles.comparativaHeader}>
            <Text style={styles.comparativaLabel}>30% Deseos / Ocio</Text>
            <Text
              style={[
                styles.comparativaEstado,
                gastosMediaBaja > target30 ? { color: colors.danger } : { color: "#F59E0B" },
              ]}
            >
              ${gastosMediaBaja.toLocaleString("es-CO")} / ${target30.toLocaleString("es-CO")}
            </Text>
          </View>
          <View style={styles.barraFondo}>
            <View
              style={[
                styles.barraProgreso,
                {
                  width: `${Math.min(
                    100,
                    target30 > 0 ? (gastosMediaBaja / target30) * 100 : 0
                  )}%`,
                  backgroundColor: gastosMediaBaja > target30 ? colors.danger : "#F59E0B",
                },
              ]}
            />
          </View>
        </View>

        {/* 20% Ahorro */}
        <View style={styles.comparativaItem}>
          <View style={styles.comparativaHeader}>
            <Text style={styles.comparativaLabel}>20% Ahorro e Inversión</Text>
            <Text style={[styles.comparativaEstado, { color: colors.success }]}>
              ${Math.max(0, saldoDisponible).toLocaleString("es-CO")} / $
              {target20.toLocaleString("es-CO")}
            </Text>
          </View>
          <View style={styles.barraFondo}>
            <View
              style={[
                styles.barraProgreso,
                {
                  width: `${Math.min(
                    100,
                    target20 > 0 && saldoDisponible > 0
                      ? (saldoDisponible / target20) * 100
                      : 0
                  )}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 14,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 10,
  },
  stackedBar: {
    height: 14,
    borderRadius: 7,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: colors.cardBorder,
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "500",
  },
  categoriaBarraRow: {
    marginBottom: 12,
  },
  categoriaBarraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoriaBarraNombre: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  categoriaBarraMonto: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
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
  comparativaItem: {
    marginBottom: 14,
  },
  comparativaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  comparativaLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  comparativaEstado: {
    fontSize: 12,
    fontWeight: "700",
  },
});
