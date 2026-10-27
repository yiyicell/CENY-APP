import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarIngresoAPI } from "@/services/api";

export default function NuevoIngresoScreen() {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleGuardar() {
    setError("");
    const monto = Number(valor);
    if (!monto || monto <= 0) {
      setError("Por favor ingresa un monto válido mayor a 0.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError("La fecha debe tener el formato AAAA-MM-DD.");
      return;
    }

    setCargando(true);
    try {
      await registrarIngresoAPI({
        valor: monto,
        fecha_ingreso: fecha,
        descripcion: descripcion.trim() || null,
      });

      setCargando(false);

      const mensaje = `¡Ingreso de $${monto.toLocaleString("es-CO")} registrado con éxito!\n\nTu saldo disponible y presupuesto 50/30/20 han sido actualizados.`;

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
      setError(err.message || "Error al registrar el ingreso en el servidor");
    }
  }

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Nuevo Ingreso</Text>
      <Text style={styles.subtitulo}>
        Registra tu salario o ingresos extras para actualizar tu saldo y presupuesto.
      </Text>

      <Text style={styles.label}>MONTO DEL INGRESO</Text>
      <TextInput
        placeholder="$ 0"
        placeholderTextColor={colors.textSecondary}
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>DESCRIPCIÓN / CONCEPTO</Text>
      <TextInput
        placeholder="Ej. Salario quincenal, Freelance, Bono"
        placeholderTextColor={colors.textSecondary}
        value={descripcion}
        onChangeText={setDescripcion}
        style={styles.input}
      />

      <Text style={styles.label}>FECHA (AAAA-MM-DD)</Text>
      <TextInput
        placeholder="AAAA-MM-DD"
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
          {cargando ? "Guardando ingreso..." : "+ Guardar Ingreso"}
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
