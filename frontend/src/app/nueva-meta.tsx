import { useState } from "react";
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
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarMetaAPI } from "@/services/api";

export default function NuevaMetaScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [fecha, setFecha] = useState("");
  const [frecuencia, setFrecuencia] = useState<"mensual" | "quincenal">("mensual");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleGuardar() {
    const valor = Number(objetivo);
    if (!nombre.trim()) return setError("Por favor ingresa un nombre para la meta");
    if (!valor || valor <= 0)
      return setError("Ingresa un valor objetivo válido mayor a 0");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return setError("La fecha debe tener el formato AAAA-MM-DD (ej: 2026-12-31)");

    setCargando(true);
    setError("");

    try {
      // Registrar mediante la API REST de FastAPI
      const metaCreada = await registrarMetaAPI({
        nombre: nombre.trim(),
        valor_objetivo: valor,
        frecuencia_ahorro: frecuencia,
        fecha_objetivo: fecha,
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

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Nueva Meta de Ahorro</Text>
      <Text style={styles.subtitulo}>
        Define un objetivo y fecha límite. Calcularemos automáticamente tu cuota de ahorro recomendada.
      </Text>

      <Text style={styles.label}>NOMBRE DE LA META</Text>
      <TextInput
        placeholder="Ej. Fondo de emergencia, Viaje, Estudio"
        placeholderTextColor={colors.textSecondary}
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />

      <Text style={styles.label}>VALOR OBJETIVO</Text>
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

      <Text style={styles.label}>FECHA OBJETIVO (AAAA-MM-DD)</Text>
      <TextInput
        placeholder="2026-12-31"
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
  buttonText: {
    color: colors.background,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
