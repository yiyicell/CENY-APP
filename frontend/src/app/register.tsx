import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";

const registerSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 letras"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nombre: "", email: "", password: "" },
  });

  async function onSubmit(datos: RegisterForm) {
    const { data, error: authError } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
    });
    if (authError || !data.user) {
      setError("root", {
        message: authError?.message ?? "No se pudo crear el usuario",
      });
      return;
    }
    const { error: dbError } = await supabase
      .from("usuarios")
      .insert({ id: data.user.id, nombre: datos.nombre });
    if (dbError) setError("root", { message: dbError.message });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <Controller
        control={control}
        name="nombre"
        render={({ field: { value, onChange } }) => (
          <TextInput
            placeholder="Nombre"
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={onChange}
            style={styles.input}
          />
        )}
      />
      {errors.nombre && (
        <Text style={styles.errorText}>{errors.nombre.message}</Text>
      )}

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            style={styles.input}
          />
        )}
      />
      {errors.email && (
        <Text style={styles.errorText}>{errors.email.message}</Text>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={onChange}
            secureTextEntry
            style={styles.input}
          />
        )}
      />
      {errors.password && (
        <Text style={styles.errorText}>{errors.password.message}</Text>
      )}

      {errors.root && (
        <Text style={styles.errorText}>{errors.root.message}</Text>
      )}

      <TouchableOpacity
        onPress={() => handleSubmit(onSubmit)()}
        disabled={isSubmitting}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Creando..." : "Registrarme"}
        </Text>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={{ color: colors.textSecondary }}>¿Ya tienes cuenta? </Text>
        <Link href="/" style={{ color: colors.primary, fontWeight: "600" }}>
          Inicia sesión
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
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  errorText: { color: colors.danger, fontSize: 12, marginBottom: 8 },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  buttonText: {
    color: colors.primaryText,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
