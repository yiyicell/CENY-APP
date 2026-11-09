import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setCargando(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setCargando(false);
    if (error) setError(error.message);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Controla tus Gastos</Text>
      <Text style={styles.subtitle}>
        Administra tus finanzas en pesos colombianos.
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={cargando}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {cargando ? "Entrando..." : "Iniciar Sesión"}
        </Text>
      </TouchableOpacity>

      {error ? (
        <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={{ color: colors.textSecondary }}>¿No tienes cuenta? </Text>
        <Link
          href="/register"
          style={{ color: colors.primary, fontWeight: "600" }}
        >
          Crear cuenta
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: colors.primaryText,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
