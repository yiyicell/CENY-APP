import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarAporteAPI } from "@/services/api";

export default function NuevoAporteScreen() {
  const router = useRouter();
  const { metaId, nombre } = useLocalSearchParams<{
    metaId: string;
    nombre: string;
  }>();
  const [valor, setValor] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleGuardar() {
    const monto = Number(valor);
    if (!monto || monto <= 0) return setError("Ingresa un monto válido mayor a 0");
    if (!metaId) return setError("Identificador de meta inválido");

    setCargando(true);
    setError("");

    try {
      await registrarAporteAPI(metaId, {
        valor: monto,
        fecha_aporte: new Date().toISOString().split("T")[0],
      });

      setCargando(false);
      const mensaje = `¡Aporte de $${monto.toLocaleString("es-CO")} abonado a "${nombre ?? "tu meta"}" con éxito!`;

      if (Platform.OS === "web") {
        window.alert(mensaje);
        router.back();
      } else {
        Alert.alert("Control Financiero - Ceny", mensaje, [
          { text: "Excelente", onPress: () => router.back() },
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

      <Text style={styles.label}>MONTO A ABONAR</Text>
      <TextInput
        placeholder="$ 0"
        placeholderTextColor={colors.textSecondary}
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
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
