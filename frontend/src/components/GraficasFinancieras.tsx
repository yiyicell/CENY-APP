import { View, Text, StyleSheet } from "react-native";
import Svg, { G, Circle, Text as SvgText } from "react-native-svg";
import { colors } from "@/constants/theme";

export type CategoriaDesglose = {
  nombre: string;
  total: number;
  porcentaje: number;
  color: string;
  icono?: string;
  prioridad?: string;
};

type Props = {
  totalIngresos: number;
  totalGastos: number;
  gastosAlta: number;
  gastosMediaBaja: number;
  categoriasDesglose: CategoriaDesglose[];
  proyeccionFinMes?: number;
  mostrarRegla503020?: boolean;
};

const PALETA_COLORES = [
  "#10B981", // Esmeralda
  "#3B82F6", // Azul
  "#F59E0B", // Ámbar / Naranja
  "#EC4899", // Rosa
  "#8B5CF6", // Violeta
  "#06B6D4", // Cian
  "#64748B", // Pizarra / Gris
];

export function GraficasFinancieras({
  totalIngresos,
  totalGastos,
  gastosAlta,
  gastosMediaBaja,
  categoriasDesglose,
  mostrarRegla503020 = false,
}: Props) {
  const target50 = totalIngresos * 0.5;
  const target30 = totalIngresos * 0.3;
  const target20 = totalIngresos * 0.2;
  const saldoDisponible = totalIngresos - totalGastos;

  // Configuración de la Gráfica de Torta (Donut)
  const chartSize = 190;
  const strokeWidth = 26;
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = chartSize / 2;

  let cumulativePercent = 0;

  return (
    <View style={styles.container}>
      {/* 1. Gráfica de Torta (Pie / Donut Chart) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribución Porcentual (Gráfica de Torta)</Text>
        <Text style={styles.cardSubtitle}>
          Participación de cada categoría en el total de egresos ejecutados
        </Text>

        {totalGastos === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No se registran gastos en este período para graficar.
            </Text>
          </View>
        ) : (
          <View style={styles.donutRow}>
            {/* SVG Circular Donut */}
            <View style={styles.svgWrapper}>
              <Svg width={chartSize} height={chartSize}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                  {/* Círculo base de fondo */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={colors.cardBorder}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />

                  {/* Segmentos de la torta */}
                  {categoriasDesglose.map((cat, index) => {
                    const sliceLength = (cat.porcentaje / 100) * circumference;
                    const strokeOffset = -(cumulativePercent / 100) * circumference;
                    cumulativePercent += cat.porcentaje;

                    const color = cat.color || PALETA_COLORES[index % PALETA_COLORES.length];

                    return (
                      <Circle
                        key={cat.nombre}
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${sliceLength} ${circumference}`}
                        strokeDashoffset={strokeOffset}
                        fill="transparent"
                        strokeLinecap="butt"
                      />
                    );
                  })}
                </G>

                {/* Texto central en el agujero de la torta */}
                <SvgText
                  x={center}
                  y={center - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={colors.textSecondary}
                >
                  TOTAL GASTOS
                </SvgText>
                <SvgText
                  x={center}
                  y={center + 12}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="bold"
                  fill={colors.textPrimary}
                >
                  ${(totalGastos / 1000).toFixed(0)}k
                </SvgText>
              </Svg>
            </View>

            {/* Leyenda lateral con porcentajes */}
            <View style={styles.donutLegend}>
              {categoriasDesglose.map((cat, index) => {
                const color = cat.color || PALETA_COLORES[index % PALETA_COLORES.length];
                return (
                  <View key={cat.nombre} style={styles.legendRow}>
                    <View style={[styles.legendBox, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.legendNombre} numberOfLines={1}>
                        {cat.nombre}
                      </Text>
                      <Text style={styles.legendValor}>
                        ${cat.total.toLocaleString("es-CO")}
                      </Text>
                    </View>
                    <Text style={styles.legendPorcentaje}>{cat.porcentaje}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* 2. Gráfica de Barras Horizontales por Categoría */}
      {categoriasDesglose.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ranking de Egresos por Categoría</Text>
          <Text style={styles.cardSubtitle}>
            Montos consolidados y porcentaje relativo sobre el total
          </Text>

          {categoriasDesglose.map((cat, index) => {
            const colorBarra = cat.color || PALETA_COLORES[index % PALETA_COLORES.length];
            return (
              <View key={cat.nombre} style={styles.categoriaBarraRow}>
                <View style={styles.categoriaBarraHeader}>
                  <Text style={styles.categoriaBarraNombre}>{cat.nombre}</Text>
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

      {/* 3. Gráfica Comparativa Regla 50/30/20 (Opcional si se activa la prop) */}
      {mostrarRegla503020 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comparativa Regla 50 / 30 / 20</Text>
          <Text style={styles.cardSubtitle}>
            Evaluación de ejecución presupuestal frente a límites recomendados
          </Text>

          {/* 50% Necesidades */}
          <View style={styles.comparativaItem}>
            <View style={styles.comparativaHeader}>
              <Text style={styles.comparativaLabel}>50% Necesidades Básicas</Text>
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
              <Text style={styles.comparativaLabel}>30% Deseos y Consumo Discrecional</Text>
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
      )}
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
    marginBottom: 3,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  svgWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutLegend: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 8,
  },
  legendNombre: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  legendValor: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  legendPorcentaje: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
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
