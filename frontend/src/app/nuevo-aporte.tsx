import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";

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
    if (!monto || monto <= 0) return setError("Ingresa un monto válido");

    setCargando(true);
    setError("");
    const { error: insertError } = await supabase.from("aportes").insert({
      meta_id: metaId,
      valor: monto,
      fecha_aporte: new Date().toISOString().split("T")[0],
    });
    setCargando(false);
    if (insertError) return setError(insertError.message);
    router.back();
  }

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Abonar a: {nombre}</Text>
      <TextInput
        placeholder="$ 0"
        placeholderTextColor={colors.textSecondary}
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
        style={styles.input}
      />
      {error ? (
        <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text>
      ) : null}
      <TouchableOpacity
        onPress={handleGuardar}
        disabled={cargando}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {cargando ? "Guardando..." : "Guardar aporte"}
        </Text>
      </TouchableOpacity>
    </PantallaFormulario>
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
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
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
    marginTop: 8,
  },
  buttonText: {
    color: colors.background,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
