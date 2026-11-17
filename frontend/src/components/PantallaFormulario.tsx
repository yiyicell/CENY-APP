import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

type Props = {
  children: React.ReactNode;
  centrado?: boolean;
  mostrarVolver?: boolean;
};

export function PantallaFormulario({
  children,
  centrado = false,
  mostrarVolver,
}: Props) {
  const router = useRouter();
  const debeMostrarVolver = mostrarVolver ?? !centrado;

  function handleVolver() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home" as any);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          centrado && { justifyContent: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.innerContainer}>
          {debeMostrarVolver && (
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={handleVolver}
                style={styles.btnVolver}
                accessibilityRole="button"
                accessibilityLabel="Volver atrás"
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={colors.textPrimary}
                />
                <Text style={styles.btnVolverTexto}>Volver</Text>
              </TouchableOpacity>
            </View>
          )}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === "web" ? 32 : 56,
    paddingBottom: 40,
  },
  innerContainer: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  btnVolver: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnVolverTexto: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
});
