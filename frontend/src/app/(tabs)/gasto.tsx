import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { GastoCard } from "@/components/GastoCard";
import { IngresoCard } from "@/components/IngresoCard";
import { AporteCard } from "@/components/AporteCard";

type Gasto = {
  id: string;
  valor: number;
  fecha_gasto: string;
  descripcion: string | null;
  categorias: { nombre: string } | null;
};

type Ingreso = {
  id: string;
  valor: number;
  fecha_ingreso: string;
  descripcion: string | null;
};

type Aporte = {
  id: string;
  valor: number;
  fecha_aporte: string;
  meta_id: string;
  metas?: { nombre: string } | null;
};

type TipoMovimiento = "gastos" | "ingresos" | "aportes";
type FiltroTiempo = "hoy" | "semana" | "mes";

const iconosPorCategoria: Record<string, string> = {
  Alimentación: "🍽️",
  Transporte: "🚌",
  Vivienda: "🏠",
  Ocio: "🎮",
  Salud: "❤️",
  Otros: "📦",
};

export default function MovimientosScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoMovimiento>("gastos");
  const [filtro, setFiltro] = useState<FiltroTiempo>("mes");
  const [busqueda, setBusqueda] = useState("");

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarMovimientos();
    }, [filtro])
  );

  function getFechaDesde(): string {
    const hoy = new Date();
    const desde = new Date();
    if (filtro === "semana") desde.setDate(hoy.getDate() - 7);
    if (filtro === "mes") desde.setDate(hoy.getDate() - 30);
    return desde.toISOString().split("T")[0];
  }

  async function cargarMovimientos() {
    setCargando(true);
    const fechaDesde = getFechaDesde();

    // 1. Cargar Gastos
    const { data: dataGastos } = await supabase
      .from("gastos")
      .select("id, valor, fecha_gasto, descripcion, categorias(nombre)")
      .gte("fecha_gasto", fechaDesde)
      .order("fecha_gasto", { ascending: false });
    if (dataGastos) setGastos(dataGastos as unknown as Gasto[]);

    // 2. Cargar Ingresos
    const { data: dataIngresos } = await supabase
      .from("ingresos")
      .select("id, valor, fecha_ingreso, descripcion")
      .gte("fecha_ingreso", fechaDesde)
      .order("fecha_ingreso", { ascending: false });
    if (dataIngresos) setIngresos(dataIngresos as Ingreso[]);

    // 3. Cargar Aportes a Metas
    const { data: dataAportes } = await supabase
      .from("aportes")
      .select("id, valor, fecha_aporte, meta_id, metas(nombre)")
      .gte("fecha_aporte", fechaDesde)
      .order("fecha_aporte", { ascending: false });
    if (dataAportes) setAportes(dataAportes as unknown as Aporte[]);

    setCargando(false);
    setRefrescando(false);
  }

  function onRefresh() {
    setRefrescando(true);
    cargarMovimientos();
  }

  // Filtrado de listas según búsqueda
  const gastosFiltrados = gastos.filter(
    (g) =>
      (g.categorias?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (g.descripcion ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const ingresosFiltrados = ingresos.filter((i) =>
    (i.descripcion ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const aportesFiltrados = aportes.filter((a) =>
    (a.metas?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // Totales de la selección actual
  const totalGastosPeriodo = gastosFiltrados.reduce((acc, g) => acc + Number(g.valor), 0);
  const totalIngresosPeriodo = ingresosFiltrados.reduce((acc, i) => acc + Number(i.valor), 0);
  const totalAportesPeriodo = aportesFiltrados.reduce((acc, a) => acc + Number(a.valor), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Movimientos Financieros</Text>
      <Text style={styles.subtitulo}>Historial auditado de ingresos, salidas y reservas</Text>

      {/* Selector Principal de Tipo: Gastos | Ingresos | Aportes */}
      <View style={styles.segmentoContainer}>
        <TouchableOpacity
          onPress={() => setTipo("gastos")}
          style={[styles.segmentoBtn, tipo === "gastos" && styles.segmentoBtnActivo]}
        >
          <Text
            style={[
              styles.segmentoTexto,
              tipo === "gastos" && styles.segmentoTextoActivo,
            ]}
          >
            Gastos ({gastosFiltrados.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTipo("ingresos")}
          style={[styles.segmentoBtn, tipo === "ingresos" && styles.segmentoBtnActivo]}
        >
          <Text
            style={[
              styles.segmentoTexto,
              tipo === "ingresos" && styles.segmentoTextoActivo,
            ]}
          >
            Ingresos ({ingresosFiltrados.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTipo("aportes")}
          style={[styles.segmentoBtn, tipo === "aportes" && styles.segmentoBtnActivo]}
        >
          <Text
            style={[
              styles.segmentoTexto,
              tipo === "aportes" && styles.segmentoTextoActivo,
            ]}
          >
            En Metas ({aportesFiltrados.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Resumen del Período y Botón de Acción */}
      <View style={styles.resumenBarra}>
        <View>
          <Text style={styles.resumenPeriodoLabel}>
            Total en el período ({filtro === "hoy" ? "Hoy" : filtro === "semana" ? "Últimos 7 días" : "Últimos 30 días"}):
          </Text>
          <Text
            style={[
              styles.resumenPeriodoMonto,
              tipo === "gastos"
                ? { color: colors.danger }
                : tipo === "ingresos"
                ? { color: colors.success }
                : { color: "#818CF8" },
            ]}
          >
            {tipo === "gastos" && `- $ ${totalGastosPeriodo.toLocaleString("es-CO")}`}
            {tipo === "ingresos" && `+ $ ${totalIngresosPeriodo.toLocaleString("es-CO")}`}
            {tipo === "aportes" && `$ ${totalAportesPeriodo.toLocaleString("es-CO")}`}
          </Text>
        </View>

        {tipo === "gastos" && (
          <TouchableOpacity
            onPress={() => router.push("/nuevo-gasto")}
            style={[styles.btnNuevo, { backgroundColor: colors.danger }]}
          >
            <Text style={styles.btnNuevoTexto}>+ Gasto</Text>
          </TouchableOpacity>
        )}

        {tipo === "ingresos" && (
          <TouchableOpacity
            onPress={() => router.push("/nuevo-ingreso")}
            style={[styles.btnNuevo, { backgroundColor: colors.success }]}
          >
            <Text style={styles.btnNuevoTexto}>+ Ingreso</Text>
          </TouchableOpacity>
        )}

        {tipo === "aportes" && (
          <TouchableOpacity
            onPress={() => router.push("/metas")}
            style={[styles.btnNuevo, { backgroundColor: "#6366F1" }]}
          >
            <Text style={styles.btnNuevoTexto}>+ Abonar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Buscador */}
      <TextInput
        placeholder={
          tipo === "gastos"
            ? "Buscar por categoría o descripción..."
            : tipo === "ingresos"
            ? "Buscar por concepto de ingreso..."
            : "Buscar por nombre de meta..."
        }
        placeholderTextColor={colors.textSecondary}
        value={busqueda}
        onChangeText={setBusqueda}
        style={styles.search}
      />

      {/* Filtros de Tiempo: Hoy | Semana | Mes */}
      <View style={styles.tabsTiempo}>
        {(["hoy", "semana", "mes"] as FiltroTiempo[]).map((opcion) => (
          <TouchableOpacity
            key={opcion}
            onPress={() => setFiltro(opcion)}
            style={[styles.tabTiempo, filtro === opcion && styles.tabTiempoActivo]}
          >
            <Text
              style={{
                color: filtro === opcion ? "#FFFFFF" : colors.textSecondary,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {opcion === "hoy" ? "Hoy" : opcion === "semana" ? "Semana" : "Mes"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Listados */}
      {cargando && !refrescando ? (
        <Text style={{ color: colors.textSecondary, marginTop: 20, textAlign: "center" }}>
          Cargando movimientos...
        </Text>
      ) : tipo === "gastos" ? (
        <FlatList
          data={gastosFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.success}
            />
          }
          renderItem={({ item }) => (
            <GastoCard
              categoria={item.categorias?.nombre ?? "Sin categoría"}
              fecha={item.fecha_gasto}
              valor={item.valor}
              icono={iconosPorCategoria[item.categorias?.nombre ?? ""] ?? "💸"}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>
                No se registran gastos en este intervalo.
              </Text>
            </View>
          }
        />
      ) : tipo === "ingresos" ? (
        <FlatList
          data={ingresosFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.success}
            />
          }
          renderItem={({ item }) => (
            <IngresoCard
              descripcion={item.descripcion}
              fecha={item.fecha_ingreso}
              valor={item.valor}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>
                No se registran ingresos en este intervalo.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={aportesFiltrados}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={colors.success}
            />
          }
          renderItem={({ item }) => (
            <AporteCard
              metaNombre={item.metas?.nombre ?? "Meta de ahorro"}
              fecha={item.fecha_aporte}
              valor={item.valor}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTexto}>
                No se registran aportes a metas en este intervalo.
              </Text>
            </View>
          }
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
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
  },
  segmentoContainer: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segmentoBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentoBtnActivo: {
    backgroundColor: colors.primary,
  },
  segmentoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  segmentoTextoActivo: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  resumenBarra: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resumenPeriodoLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  resumenPeriodoMonto: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  btnNuevo: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnNuevoTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: colors.textPrimary,
    marginBottom: 12,
    fontSize: 14,
  },
  tabsTiempo: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  tabTiempo: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabTiempoActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
  },
  emptyTexto: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
