import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarAporteAPI, obtenerMetasAPI } from "@/services/api";
import { obtenerHoyCO, convertirCOaISO, esFechaValida } from "@/utils/date";
import {
  obtenerOrigenesAportesLocal,
  OrigenAporte,
} from "@/utils/aportesOrigen";

export default function NuevoAporteScreen() {
  const router = useRouter();
  const { metaId, nombre } = useLocalSearchParams<{
    metaId: string;
    nombre: string;
  }>();
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(obtenerHoyCO());
  const [origen, setOrigen] = useState<OrigenAporte>("saldo");
  const [saldoLibreActual, setSaldoLibreActual] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarSaldoDisponible() {
      try {
        const [{ data: ingresos }, { data: gastos }] = await Promise.all([
          supabase.from("ingresos").select("valor"),
          supabase.from("gastos").select("valor"),
        ]);

        const totIng = (ingresos || []).reduce((acc, i) => acc + Number(i.valor), 0);
        const totGas = (gastos || []).reduce((acc, g) => acc + Number(g.valor), 0);

        let ahorroDesdeSaldo = 0;
        let cargadoAPI = false;
        try {
          const metasAPI = await obtenerMetasAPI();
          if (Array.isArray(metasAPI)) {
            ahorroDesdeSaldo = metasAPI.reduce(
              (acc: number, m: any) =>
                acc + Number(m.ahorro_desde_saldo ?? m.total_ahorrado ?? 0),
              0
            );
            cargadoAPI = true;
          }
        } catch {
          // Fallback directo a Supabase + AsyncStorage
        }

        if (!cargadoAPI) {
          const [{ data: aportes }, origenesMap] = await Promise.all([
            supabase.from("aportes").select("id, valor"),
            obtenerOrigenesAportesLocal(),
          ]);
          ahorroDesdeSaldo = (aportes || []).reduce((acc, a) => {
            const orig = origenesMap[String(a.id)] || "saldo";
            return orig === "externo" ? acc : acc + Number(a.valor);
          }, 0);
        }

        const libre = Math.max(0, totIng - totGas - ahorroDesdeSaldo);
        setSaldoLibreActual(libre);
        if (libre <= 0) {
          setOrigen("externo");
        }
      } catch {
        setSaldoLibreActual(null);
      }
    }
    cargarSaldoDisponible();
  }, []);

  const montoNum = Number(valor) || 0;
  const excedeSaldo =
    saldoLibreActual !== null &&
    origen === "saldo" &&
    montoNum > saldoLibreActual;

  async function handleGuardar() {
    const monto = Number(valor);
    if (!monto || monto <= 0) return setError("Ingresa un monto válido mayor a 0");
    if (!metaId) return setError("Identificador de meta inválido");
    if (!esFechaValida(fecha)) {
      return setError("La fecha debe tener formato DD/MM/AAAA válido (ej: " + obtenerHoyCO() + ")");
    }

    setCargando(true);
    setError("");

    try {
      const fechaISO = convertirCOaISO(fecha);

      await registrarAporteAPI(metaId, {
        valor: monto,
        fecha_aporte: fechaISO,
        origen,
      });

      setCargando(false);
      const mensaje =
        origen === "externo"
          ? `Aporte de $${monto.toLocaleString("es-CO")} abonado a "${nombre ?? "tu meta"}" desde ahorro previo. Tu saldo libre del mes se mantuvo intacto.`
          : `Aporte de $${monto.toLocaleString("es-CO")} abonado a "${nombre ?? "tu meta"}" desde tu saldo disponible.`;

      if (Platform.OS === "web") {
        window.alert(mensaje);
        router.back();
      } else {
        Alert.alert("Control Financiero - Ceny", mensaje, [
          { text: "Continuar", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      setCargando(false);
      setError(err.message || "Error al registrar el aporte en el servidor");
    }
  }

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Abonar a meta</Text>
      <Text style={styles.subtitulo}>{nombre ? `Meta: ${nombre}` : "Abonar ahorro"}</Text>

      {saldoLibreActual !== null && (
        <View style={styles.saldoPill}>
          <Text style={styles.saldoPillLabel}>Saldo libre del mes:</Text>
          <Text style={styles.saldoPillValor}>
            ${saldoLibreActual.toLocaleString("es-CO")}
          </Text>
        </View>
      )}

      <Text style={styles.label}>¿DE DÓNDE SALE ESTE DINERO?</Text>
      <View style={styles.origenRow}>
        <TouchableOpacity
          onPress={() => setOrigen("saldo")}
          style={[
            styles.origenCard,
            origen === "saldo" && styles.origenCardActivo,
          ]}
        >
          <Text
            style={[
              styles.origenTitulo,
              origen === "saldo" && styles.origenTituloActivo,
            ]}
          >
            De mi saldo actual
          </Text>
          <Text style={styles.origenDesc}>
            Descuenta de tus ingresos del mes.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setOrigen("externo")}
          style={[
            styles.origenCard,
            origen === "externo" && styles.origenCardActivoExterno,
          ]}
        >
          <Text
            style={[
              styles.origenTitulo,
              origen === "externo" && styles.origenTituloActivoExterno,
            ]}
          >
            Ahorro previo / Externo
          </Text>
          <Text style={styles.origenDesc}>
            Dinero aparte; no afecta tu saldo libre.
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>MONTO A ABONAR (COP)</Text>
      <TextInput
        placeholder="$ 0"
        placeholderTextColor={colors.textSecondary}
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
        style={styles.input}
      />
      {montoNum > 0 && (
        <Text style={styles.montoPreview}>
          Valor: $ {montoNum.toLocaleString("es-CO")} COP
        </Text>
      )}

      {/* Aviso inteligente si supera el saldo libre disponible */}
      {excedeSaldo && saldoLibreActual !== null && (
        <View style={styles.avisoExcesoBox}>
          <Text style={styles.avisoExcesoTitulo}>
            Este abono supera tu saldo disponible
          </Text>
          <Text style={styles.avisoExcesoTexto}>
            Tienes ${saldoLibreActual.toLocaleString("es-CO")} libres del mes y vas a abonar $
            {montoNum.toLocaleString("es-CO")}. Si es dinero que ya tenías guardado aparte, cámbialo para no dejar tu saldo en $0:
          </Text>
          <TouchableOpacity
            onPress={() => setOrigen("externo")}
            style={styles.btnCambiarExterno}
          >
            <Text style={styles.btnCambiarExternoTexto}>
              Usar como ahorro previo / externo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>FECHA DEL ABONO (DD/MM/AAAA)</Text>
      <TextInput
        placeholder={obtenerHoyCO()}
        placeholderTextColor={colors.textSecondary}
        value={fecha}
        onChangeText={setFecha}
        autoCapitalize="none"
        style={styles.input}
      />

      {error ? (
        <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={handleGuardar}
        disabled={cargando}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {cargando ? "Guardando aporte..." : "+ Abonar Aporte"}
        </Text>
      </TouchableOpacity>
    </PantallaFormulario>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitulo: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 14,
  },
  saldoPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  saldoPillLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  saldoPillValor: {
    color: colors.success,
    fontSize: 15,
    fontWeight: "800",
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 6,
    fontWeight: "600",
  },
  origenRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  origenCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
  },
  origenCardActivo: {
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderColor: colors.success,
  },
  origenCardActivoExterno: {
    backgroundColor: "rgba(99, 102, 241, 0.14)",
    borderColor: "#818CF8",
  },
  origenTitulo: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  origenTituloActivo: {
    color: colors.success,
  },
  origenTituloActivoExterno: {
    color: "#A5B4FC",
  },
  origenDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  montoPreview: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "600",
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 4,
  },
  avisoExcesoBox: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avisoExcesoTitulo: {
    color: "#FBBF24",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  avisoExcesoTexto: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  btnCambiarExterno: {
    backgroundColor: "#6366F1",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  btnCambiarExternoTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: colors.background,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
