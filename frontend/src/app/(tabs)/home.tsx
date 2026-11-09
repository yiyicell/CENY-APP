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
import { IngresoCard } from "@/components/IngresoCard";

type Gasto = {
  id: string;
  valor: number;
  fecha_gasto: string;
  categorias: { nombre: string } | null;
};

type Ingreso = {
  id: string;
  valor: number;
  fecha_ingreso: string;
  descripcion: string | null;
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
  const [ingresosRecientes, setIngresosRecientes] = useState<Ingreso[]>([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [metasActivas, setMetasActivas] = useState(0);
  const [totalAhorrado, setTotalAhorrado] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const [tabRecientes, setTabRecientes] = useState<"gastos" | "ingresos">("gastos");

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
      .select("id, valor, fecha_ingreso, descripcion")
      .order("fecha_ingreso", { ascending: false });
    const ingTotal = (ingresos || []).reduce((acc, i) => acc + Number(i.valor), 0);
    setTotalIngresos(ingTotal);
    if (ingresos) {
      setIngresosRecientes(ingresos.slice(0, 4) as Ingreso[]);
    }

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

  // Saldo libre real disponible para gastar (no menor a 0)
  const saldoCalculado = totalIngresos - totalGastos - totalAhorrado;
  const saldoLibre = Math.max(0, saldoCalculado);
  const porcentajeGastado = totalIngresos > 0 ? Math.round((totalGastos / totalIngresos) * 100) : 0;

  // Cálculo de Salud Financiera CENY (Score 0 - 100)
  let scoreSalud = 100;
  let estadoSalud = "Excelente";
  let colorSalud = colors.success;
  let consejoSalud = "Tu balance presupuestal se mantiene en condiciones ideales.";

  if (totalIngresos === 0) {
    scoreSalud = 50;
    estadoSalud = "Sin Datos";
    colorSalud = colors.textSecondary;
    consejoSalud = "Registra tus ingresos mensuales para calcular tu salud financiera.";
  } else {
    let deducciones = 0;
    if (totalGastos > totalIngresos) {
      deducciones += 40;
    } else if (porcentajeGastado > 80) {
      deducciones += 25;
    }
    if (totalAhorrado === 0 && saldoCalculado <= 0) {
      deducciones += 20;
    }
    if (saldoCalculado <= 0) {
      deducciones += 15;
    }

    scoreSalud = Math.max(15, Math.min(100, 100 - deducciones));

    if (scoreSalud >= 85) {
      estadoSalud = "Excelente";
      colorSalud = colors.success;
      consejoSalud = "Presupuesto equilibrado y capacidad de ahorro sostenida.";
    } else if (scoreSalud >= 70) {
      estadoSalud = "Saludable";
      colorSalud = "#3B82F6";
      consejoSalud = "Distribución controlada; continúa reforzando tus metas de ahorro.";
    } else if (scoreSalud >= 50) {
      estadoSalud = "En Observación";
      colorSalud = "#F59E0B";
      consejoSalud = "Se sugiere moderar compras discrecionales para recuperar margen de ahorro.";
    } else {
      estadoSalud = "En Riesgo";
      colorSalud = colors.danger;
      consejoSalud = "Los egresos superan los ingresos. Se requiere contención prioritaria de gastos.";
    }
  }

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
          <Text style={styles.subtitulo}>Resumen patrimonial y flujo de fondos</Text>
        </View>
        <TouchableOpacity
          onPress={() => supabase.auth.signOut()}
          style={styles.btnSalir}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Saldo Disponible Real */}
      <View style={styles.saldoCard}>
        <View style={styles.saldoHeader}>
          <Text style={styles.saldoLabel}>Saldo libre para gastar</Text>
          <View
            style={[
              styles.badgeReserva,
              saldoCalculado < 0 && {
                backgroundColor: "#EF444422",
                borderColor: "#EF444455",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeReservaTexto,
                saldoCalculado < 0 && { color: "#F87171" },
              ]}
            >
              {saldoCalculado < 0
                ? "Sin saldo libre"
                : totalAhorrado > 0
                ? "Ahorro protegido"
                : "Disponible"}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.saldoValor,
            saldoLibre === 0 ? { color: colors.textSecondary } : { color: colors.success },
          ]}
        >
          ${saldoLibre.toLocaleString("es-CO")}
        </Text>

        <View style={styles.saldoDesglose}>
          <View style={styles.desgloseCol}>
            <Text style={styles.desgloseLabel}>Ingresos</Text>
            <Text style={[styles.desgloseText, { color: colors.success }]}>
              +${totalIngresos.toLocaleString("es-CO")}
            </Text>
          </View>

          <View style={styles.desgloseDivider} />

          <View style={styles.desgloseCol}>
            <Text style={styles.desgloseLabel}>Gastos</Text>
            <Text style={[styles.desgloseText, { color: colors.danger }]}>
              -${totalGastos.toLocaleString("es-CO")}
            </Text>
          </View>

          <View style={styles.desgloseDivider} />

          <View style={styles.desgloseCol}>
            <Text style={styles.desgloseLabel}>En Metas</Text>
            <Text style={[styles.desgloseText, { color: "#818CF8" }]}>
              -${totalAhorrado.toLocaleString("es-CO")}
            </Text>
          </View>
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

      {/* Tarjeta de Salud Financiera CENY */}
      <View style={styles.saludCard}>
        <View style={styles.saludHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.saludLabel}>Salud Financiera CENY</Text>
            <Text style={styles.saludConsejo}>{consejoSalud}</Text>
          </View>
          <View
            style={[
              styles.saludBadge,
              { backgroundColor: colorSalud + "22", borderColor: colorSalud + "44" },
            ]}
          >
            <Text style={[styles.saludScore, { color: colorSalud }]}>{scoreSalud}/100</Text>
            <Text style={[styles.saludEstado, { color: colorSalud }]}>{estadoSalud}</Text>
          </View>
        </View>

        <View style={styles.saludBarraFondo}>
          <View
            style={[
              styles.saludBarraProgreso,
              { width: `${scoreSalud}%`, backgroundColor: colorSalud },
            ]}
          />
        </View>
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
                ? "Límite en alerta"
                : "Dentro de límites"
              : "Registra ingresos"}
          </Text>
        </View>

        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Metas de ahorro</Text>
          <Text style={styles.miniValor}>
            {metasActivas} {metasActivas === 1 ? "activa" : "activas"}
          </Text>
          <Text style={[styles.miniSubtext, { color: "#818CF8", fontWeight: "600" }]}>
            ${totalAhorrado.toLocaleString("es-CO")} acumulados
          </Text>
        </View>
      </View>

      {/* Reto Semanal de Ahorro */}
      <View style={styles.retoCard}>
        <View style={styles.retoHeader}>
          <Text style={styles.retoIcono}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.retoTitulo}>Reto de Ahorro de la Semana</Text>
            <Text style={styles.retoDesc}>
              {metasActivas > 0
                ? "Semana Cero Fugas: Evita 2 microcompras no esenciales en café o snacks y abona $10.000 COP a tu meta activa."
                : "Reto Inicial: Define tu primer objetivo de ahorro para 30 días y da el paso inicial hoy mismo."}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push(metasActivas > 0 ? "/metas" : "/nueva-meta")}
          style={styles.btnReto}
        >
          <Text style={styles.btnRetoTexto}>
            {metasActivas > 0 ? "+ Cumplir Reto en Metas" : "+ Crear Meta de Ahorro"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Recientes: Gastos vs Ingresos */}
      <View style={styles.recientesHeader}>
        <View style={styles.tabsRecientes}>
          <TouchableOpacity
            onPress={() => setTabRecientes("gastos")}
            style={[
              styles.tabRecienteBtn,
              tabRecientes === "gastos" && styles.tabRecienteActivo,
            ]}
          >
            <Text
              style={[
                styles.tabRecienteTexto,
                tabRecientes === "gastos" && styles.tabRecienteTextoActivo,
              ]}
            >
              Gastos recientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTabRecientes("ingresos")}
            style={[
              styles.tabRecienteBtn,
              tabRecientes === "ingresos" && styles.tabRecienteActivo,
            ]}
          >
            <Text
              style={[
                styles.tabRecienteTexto,
                tabRecientes === "ingresos" && styles.tabRecienteTextoActivo,
              ]}
            >
              Ingresos recientes
            </Text>
          </TouchableOpacity>
        </View>

        <Link href="/gasto" style={styles.linkVerTodos}>
          Ver todos
        </Link>
      </View>

      {/* Listado condicional */}
      {tabRecientes === "gastos" ? (
        gastosRecientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: colors.textSecondary }}>
              No registras gastos recientes en el período.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/nuevo-gasto")}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                + Registrar nuevo gasto
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
        )
      ) : (
        ingresosRecientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: colors.textSecondary }}>
              No registras ingresos recientes en el período.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/nuevo-ingreso")}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: colors.success, fontWeight: "600" }}>
                + Registrar nuevo ingreso
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          ingresosRecientes.map((i) => (
            <IngresoCard
              key={i.id}
              descripcion={i.descripcion}
              fecha={i.fecha_ingreso}
              valor={i.valor}
            />
          ))
        )
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
    fontSize: 13,
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
  saldoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saldoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  badgeReserva: {
    backgroundColor: "#6366F122",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6366F144",
  },
  badgeReservaTexto: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "600",
  },
  saldoValor: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 14,
  },
  saldoDesglose: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 12,
  },
  desgloseCol: {
    flex: 1,
    alignItems: "center",
  },
  desgloseDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  desgloseLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
    fontWeight: "500",
  },
  desgloseText: {
    fontSize: 13,
    fontWeight: "700",
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
    marginBottom: 14,
  },
  tabsRecientes: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabRecienteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabRecienteActivo: {
    backgroundColor: colors.primary,
  },
  tabRecienteTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  tabRecienteTextoActivo: {
    color: "#FFFFFF",
  },
  linkVerTodos: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: colors.card,
    padding: 22,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  saludCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  saludHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  saludLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  saludConsejo: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  saludBadge: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  saludScore: {
    fontSize: 16,
    fontWeight: "800",
  },
  saludEstado: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  saludBarraFondo: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardBorder,
    overflow: "hidden",
  },
  saludBarraProgreso: {
    height: "100%",
    borderRadius: 3,
  },
  retoCard: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  retoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  retoIcono: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 1,
  },
  retoTitulo: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  retoDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  btnReto: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  btnRetoTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
