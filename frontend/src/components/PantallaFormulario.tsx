import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { colors } from "@/constants/theme";

type Props = { children: React.ReactNode; centrado?: boolean };

export function PantallaFormulario({ children, centrado = false }: Props) {
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
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenido: { flexGrow: 1, padding: 20, paddingTop: 60 },
});
