import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { GastoCard } from "@/components/GastoCard";

type Gasto = {
  id: string;
  valor: number;
  fecha_gasto: string;
  categorias: { nombre: string } | null;
};

const iconosPorCategoria: Record<string, string> = {
  Alimentación: "🍽️",
  Transporte: "🚌",
  Vivienda: "🏠",
  Ocio: "🎮",
  Salud: "❤️",
  Otros: "📦",
};

export default function HomeScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [gastosRecientes, setGastosRecientes] = useState<Gasto[]>([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [metasActivas, setMetasActivas] = useState(0);
  const [totalAhorrado, setTotalAhorrado] = useState(0);
  const [refrescando, setRefrescando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  async function cargarDatos() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Nombre de usuario
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("id", userData.user.id)
      .single();
    if (usuario) setNombre(usuario.nombre);

    // Ingresos
    const { data: ingresos } = await supabase
      .from("ingresos")
      .select("valor");
    const ingTotal = (ingresos || []).reduce((acc, i) => acc + Number(i.valor), 0);
    setTotalIngresos(ingTotal);

    // Gastos recientes y total gastos
    const { data: gastos } = await supabase
      .from("gastos")
      .select("id, valor, fecha_gasto, categorias(nombre)")
      .order("fecha_gasto", { ascending: false });

    if (gastos) {
      setGastosRecientes(gastos.slice(0, 4) as unknown as Gasto[]);
      const gasTotal = gastos.reduce((acc, g) => acc + Number(g.valor), 0);
      setTotalGastos(gasTotal);
    }

    // Metas
    const { data: metas } = await supabase
      .from("metas")
      .select("id, estado");
    if (metas) {
      const activas = metas.filter((m) => m.estado !== "cumplido").length;
      setMetasActivas(activas);
    }

    // Aportes totales
    const { data: aportes } = await supabase
      .from("aportes")
      .select("valor");
    if (aportes) {
      const totAhorro = aportes.reduce((acc, a) => acc + Number(a.valor), 0);
      setTotalAhorrado(totAhorro);
    }

    setRefrescando(false);
  }

  function onRefresh() {
    setRefrescando(true);
    cargarDatos();
  }

  const saldoDisponible = totalIngresos - totalGastos;
  const porcentajeGastado = totalIngresos > 0 ? Math.round((totalGastos / totalIngresos) * 100) : 0;

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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.saludo}>Hola{nombre ? `, ${nombre}` : ""}</Text>
          <Text style={styles.subtitulo}>Aquí está tu resumen financiero</Text>
        </View>
        <TouchableOpacity
          onPress={() => supabase.auth.signOut()}
          style={styles.btnSalir}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Saldo Disponible */}
      <View style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>Saldo disponible</Text>
        <Text
          style={[
            styles.saldoValor,
            saldoDisponible < 0 ? { color: colors.danger } : { color: colors.success },
          ]}
        >
          ${saldoDisponible.toLocaleString("es-CO")}
        </Text>
        <View style={styles.saldoDesglose}>
          <Text style={styles.desgloseText}>
            🟢 Ingresos: ${totalIngresos.toLocaleString("es-CO")}
          </Text>
          <Text style={styles.desgloseText}>
            🔴 Gastos: ${totalGastos.toLocaleString("es-CO")}
          </Text>
        </View>
      </View>

      {/* Botones de Acción Rápida */}
      <View style={styles.accionesRow}>
        <TouchableOpacity
          onPress={() => router.push("/nuevo-gasto")}
          style={[styles.btnAccion, { backgroundColor: "#EF4444" }]}
        >
          <Text style={styles.btnAccionIcono}>💸</Text>
          <Text style={styles.btnAccionTexto}>+ Gasto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/nuevo-ingreso")}
          style={[styles.btnAccion, { backgroundColor: "#10B981" }]}
        >
          <Text style={styles.btnAccionIcono}>💵</Text>
          <Text style={styles.btnAccionTexto}>+ Ingreso</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/nueva-meta")}
          style={[styles.btnAccion, { backgroundColor: "#6366F1" }]}
        >
          <Text style={styles.btnAccionIcono}>🎯</Text>
          <Text style={styles.btnAccionTexto}>+ Meta</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjetas Informativas */}
      <View style={styles.filaCards}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Presupuesto (50/30/20)</Text>
          <Text style={styles.miniValor}>
            {totalIngresos > 0 ? `${porcentajeGastado}% consumido` : "Sin ingresos"}
          </Text>
          <Text style={styles.miniSubtext}>
            {totalIngresos > 0
              ? porcentajeGastado > 80
                ? "⚠️ Límite excedido"
                : "✅ En presupuesto"
              : "Registra ingresos para evaluar"}
          </Text>
        </View>

        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Metas de ahorro</Text>
          <Text style={styles.miniValor}>
            {metasActivas} {metasActivas === 1 ? "activa" : "activas"}
          </Text>
          <Text style={styles.miniSubtext}>
            ${totalAhorrado.toLocaleString("es-CO")} ahorrados
          </Text>
        </View>
      </View>

      {/* Historial Reciente */}
      <View style={styles.recientesHeader}>
        <Text style={styles.recientesTitle}>Gastos recientes</Text>
        <Link href="/gasto" style={{ color: colors.primary, fontWeight: "600" }}>
          Ver todos
        </Link>
      </View>

      {gastosRecientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>
            Aún no tienes gastos registrados.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/nuevo-gasto")}
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Registra tu primer gasto
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        gastosRecientes.map((g) => (
          <GastoCard
            key={g.id}
            categoria={g.categorias?.nombre ?? "Sin categoría"}
            fecha={g.fecha_gasto}
            valor={g.valor}
            icono={iconosPorCategoria[g.categorias?.nombre ?? ""] ?? "💸"}
          />
        ))
      )}

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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  saludo: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitulo: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  btnSalir: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  saldoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  saldoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  saldoValor: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 10,
  },
  saldoDesglose: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
  },
  desgloseText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  accionesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  btnAccion: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnAccionIcono: {
    fontSize: 18,
    marginBottom: 2,
  },
  btnAccionTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  filaCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  miniLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  miniValor: {
    color: colors.textPrimary,
    fontWeight: "700",
    marginTop: 6,
    fontSize: 15,
  },
  miniSubtext: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  recientesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recientesTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyState: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
  },
});
