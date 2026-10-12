import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";

export default function NuevaMetaScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [fecha, setFecha] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleGuardar() {
    const valor = Number(objetivo);
    if (!nombre.trim()) return setError("Ponle un nombre a la meta");
    if (!valor || valor <= 0)
      return setError("Ingresa un valor objetivo válido");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return setError("La fecha debe ser AAAA-MM-DD");

    setCargando(true);
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("metas").insert({
      usuario_id: userData.user!.id,
      nombre,
      valor_objetivo: valor,
      fecha_objetivo: fecha,
    });
    setCargando(false);
    if (insertError) return setError(insertError.message);
    router.back();
  }

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Nueva meta</Text>
      <TextInput
        placeholder="Nombre (ej. Fondo de emergencia)"
        placeholderTextColor={colors.textSecondary}
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />
      <TextInput
        placeholder="Valor objetivo"
        placeholderTextColor={colors.textSecondary}
        value={objetivo}
        onChangeText={setObjetivo}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Fecha objetivo (2026-12-31)"
        placeholderTextColor={colors.textSecondary}
        value={fecha}
        onChangeText={setFecha}
        autoCapitalize="none"
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
          {cargando ? "Guardando..." : "Guardar meta"}
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
