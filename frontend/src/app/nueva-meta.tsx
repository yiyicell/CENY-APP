import { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  View,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarMetaAPI } from "@/services/api";
import { convertirCOaISO, esFechaValida } from "@/utils/date";

export default function NuevaMetaScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [fecha, setFecha] = useState("");
  const [frecuencia, setFrecuencia] = useState<"mensual" | "quincenal">("mensual");
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarIngresos() {
      const { data } = await supabase.from("ingresos").select("valor");
      const tot = (data || []).reduce((acc, i) => acc + Number(i.valor), 0);
      setTotalIngresos(tot);
    }
    cargarIngresos();
  }, []);

  async function handleGuardar() {
    const valor = Number(objetivo);
    if (!nombre.trim()) return setError("Por favor ingresa un nombre para la meta");
    if (!valor || valor <= 0)
      return setError("Ingresa un valor objetivo válido mayor a 0");
    if (!esFechaValida(fecha))
      return setError("La fecha debe tener formato DD/MM/AAAA válido (ej: 31/12/2026)");

    setCargando(true);
    setError("");

    try {
      const fechaISO = convertirCOaISO(fecha);

      // Registrar mediante la API REST de FastAPI
      const metaCreada = await registrarMetaAPI({
        nombre: nombre.trim(),
        valor_objetivo: valor,
        frecuencia_ahorro: frecuencia,
        fecha_objetivo: fechaISO,
      });

      setCargando(false);

      const cuota = metaCreada.cuota_sugerida
        ? `$${Number(metaCreada.cuota_sugerida).toLocaleString("es-CO")}`
        : "N/A";
      const periodos = metaCreada.periodos_restantes ?? 1;

      const mensaje = `¡Meta "${metaCreada.nombre}" creada con éxito!\n\n💡 Cuota sugerida: ${cuota} cada ${frecuencia} durante ${periodos} período(s) para alcanzarla a tiempo.`;

      if (Platform.OS === "web") {
        window.alert(mensaje);
        router.back();
      } else {
        Alert.alert("Control Financiero - Ceny", mensaje, [
          { text: "Entendido", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      setCargando(false);
      setError(err.message || "Error al crear la meta en el servidor");
    }
  }

  // Cálculo en vivo de viabilidad algorítmica
  const valorNum = Number(objetivo) || 0;
  let diagnosticoViabilidad: {
    cuota: number;
    cuotaMensual: number;
    periodos: number;
    pctIngreso: number;
    tipo: "viable" | "moderada" | "dificil" | "sin_ingresos";
    mensaje: string;
  } | null = null;

  if (valorNum > 0 && esFechaValida(fecha)) {
    const partes = fecha.split("/").map(Number);
    const d = partes[0];
    const m = partes[1];
    const y = partes[2];
    const fechaLimite = new Date(y, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const difMs = fechaLimite.getTime() - hoy.getTime();
    const dias = Math.max(1, Math.ceil(difMs / (1000 * 60 * 60 * 24)));
    const periodos = frecuencia === "mensual" ? Math.max(1, Math.ceil(dias / 30)) : Math.max(1, Math.ceil(dias / 15));
    const cuota = Math.round(valorNum / periodos);
    const cuotaMensual = frecuencia === "quincenal" ? cuota * 2 : cuota;
    const pctIngreso = totalIngresos > 0 ? Math.round((cuotaMensual / totalIngresos) * 100) : 0;

    let tipo: "viable" | "moderada" | "dificil" | "sin_ingresos" = "viable";
    let mensaje = "";

    if (totalIngresos === 0) {
      tipo = "sin_ingresos";
      mensaje = `Cuota estimada: $${cuota.toLocaleString("es-CO")} cada ${frecuencia} (${periodos} períodos). Registra tus ingresos en Inicio para evaluar su viabilidad frente a la regla 50/30/20.`;
    } else if (pctIngreso <= 20) {
      tipo = "viable";
      mensaje = `Meta Altamente Viable: La cuota mensual ($${cuotaMensual.toLocaleString("es-CO")}) representa el ${pctIngreso}% de tus ingresos mensuales, encajando dentro del 20% de ahorro recomendado.`;
    } else if (pctIngreso <= 40) {
      tipo = "moderada";
      mensaje = `Meta Moderadamente Exigente: La cuota mensual ($${cuotaMensual.toLocaleString("es-CO")}) requiere el ${pctIngreso}% de tus ingresos. Para alcanzarla a tiempo deberás moderar tus compras en ocio.`;
    } else {
      tipo = "dificil";
      mensaje = `Meta de Alta Dificultad: La cuota mensual ($${cuotaMensual.toLocaleString("es-CO")}) absorbe el ${pctIngreso}% de tus ingresos. Te sugerimos ampliar el plazo para evitar déficit.`;
    }

    diagnosticoViabilidad = {
      cuota,
      cuotaMensual,
      periodos,
      pctIngreso,
      tipo,
      mensaje,
    };
  }

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Nueva Meta de Ahorro</Text>
      <Text style={styles.subtitulo}>
        Define un objetivo y fecha límite. Evaluaremos en tiempo real su viabilidad financiera para ayudarte a cumplirla conscientemente.
      </Text>

      <Text style={styles.label}>NOMBRE DE LA META</Text>
      <TextInput
        placeholder="Ej. Fondo de emergencia, Viaje, Estudio"
        placeholderTextColor={colors.textSecondary}
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />

      <Text style={styles.label}>VALOR OBJETIVO (COP)</Text>
      <TextInput
        placeholder="$ 0"
        placeholderTextColor={colors.textSecondary}
        value={objetivo}
        onChangeText={setObjetivo}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>FRECUENCIA DE AHORRO</Text>
      <View style={styles.frecuenciaRow}>
        <TouchableOpacity
          onPress={() => setFrecuencia("mensual")}
          style={[
            styles.frecuenciaBoton,
            frecuencia === "mensual" && styles.frecuenciaBotonActivo,
          ]}
        >
          <Text
            style={[
              styles.frecuenciaTexto,
              frecuencia === "mensual" && styles.frecuenciaTextoActivo,
            ]}
          >
            Mensual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFrecuencia("quincenal")}
          style={[
            styles.frecuenciaBoton,
            frecuencia === "quincenal" && styles.frecuenciaBotonActivo,
          ]}
        >
          <Text
            style={[
              styles.frecuenciaTexto,
              frecuencia === "quincenal" && styles.frecuenciaTextoActivo,
            ]}
          >
            Quincenal
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>FECHA LÍMITE (DD/MM/AAAA)</Text>
      <TextInput
        placeholder="31/12/2026"
        placeholderTextColor={colors.textSecondary}
        value={fecha}
        onChangeText={setFecha}
        autoCapitalize="none"
        style={styles.input}
      />

      {/* Asistente de Viabilidad Financiera en Vivo */}
      {diagnosticoViabilidad && (
        <View
          style={[
            styles.viabilidadCard,
            diagnosticoViabilidad.tipo === "viable"
              ? styles.viabilidadCardViable
              : diagnosticoViabilidad.tipo === "moderada"
              ? styles.viabilidadCardModerada
              : diagnosticoViabilidad.tipo === "dificil"
              ? styles.viabilidadCardDificil
              : styles.viabilidadCardNeutro,
          ]}
        >
          <View style={styles.viabilidadHeader}>
            <Text style={styles.viabilidadTitulo}>
              {diagnosticoViabilidad.tipo === "viable"
                ? "Cuota Recomendada: Meta Viable"
                : diagnosticoViabilidad.tipo === "moderada"
                ? "Cuota Recomendada: Meta Exigente"
                : diagnosticoViabilidad.tipo === "dificil"
                ? "Cuota Recomendada: Alta Dificultad"
                : "Cuota de Ahorro Calculada"}
            </Text>
            <Text
              style={[
                styles.viabilidadCuota,
                diagnosticoViabilidad.tipo === "viable"
                  ? { color: colors.success }
                  : diagnosticoViabilidad.tipo === "moderada"
                  ? { color: "#F59E0B" }
                  : diagnosticoViabilidad.tipo === "dificil"
                  ? { color: colors.danger }
                  : { color: colors.textPrimary },
              ]}
            >
              ${diagnosticoViabilidad.cuota.toLocaleString("es-CO")} / {frecuencia}
            </Text>
          </View>
          <Text style={styles.viabilidadMensaje}>{diagnosticoViabilidad.mensaje}</Text>
        </View>
      )}

      {error ? (
        <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={handleGuardar}
        disabled={cargando}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {cargando ? "Guardando y calculando..." : "+ Guardar Meta"}
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
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 6,
    fontWeight: "600",
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
  frecuenciaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  frecuenciaBoton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: "center",
  },
  frecuenciaBotonActivo: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  frecuenciaTexto: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  frecuenciaTextoActivo: {
    color: colors.background,
    fontWeight: "700",
  },
  button: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  viabilidadCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  viabilidadCardViable: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  viabilidadCardModerada: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  viabilidadCardDificil: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  viabilidadCardNeutro: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
  },
  viabilidadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  viabilidadTitulo: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  viabilidadCuota: {
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  viabilidadMensaje: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  buttonText: {
    color: colors.background,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
