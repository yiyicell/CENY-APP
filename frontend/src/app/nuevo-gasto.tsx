import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarGastoAPI, obtenerCategoriasAPI } from "@/services/api";

type Categoria = { id: string; nombre: string };

export default function NuevoGastoScreen() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarCategorias() {
      try {
        const data = await obtenerCategoriasAPI();
        if (data && data.length > 0) {
          setCategorias(data);
          setCategoriaId(data[0].id);
          return;
        }
      } catch (e) {
        // Fallback a Supabase
      }
      const { data } = await supabase.from("categorias").select("id, nombre");
      if (data && data.length > 0) {
        setCategorias(data);
        setCategoriaId(data[0].id);
      }
    }
    cargarCategorias();
  }, []);

  async function handleGuardar() {
    setError("");
    const monto = Number(valor);
    if (!monto || monto <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    if (!categoriaId) {
      setError("Selecciona una categoría");
      return;
    }

    setCargando(true);
    try {
      // Llamada a la API de FastAPI conforme a la arquitectura y diagrama de secuencia
      const res = await registrarGastoAPI({
        categoria_id: categoriaId,
        valor: monto,
        fecha_gasto: new Date().toISOString().split("T")[0],
        descripcion: descripcion || null,
        frecuencia: null,
      });

      setCargando(false);

      const mensajeMostrar = res.alerta
        ? `${res.alerta}\n\n💡 Sugerencia (Regla 50/30/20):\n${res.sugerencia || ""}`
        : res.sugerencia
        ? `💡 Sugerencia (Regla 50/30/20):\n${res.sugerencia}`
        : "Gasto registrado exitosamente.";

      if (Platform.OS === "web") {
        window.alert(mensajeMostrar);
        router.back();
      } else {
        Alert.alert("Control Financiero - Ceny", mensajeMostrar, [
          { text: "Entendido", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      setCargando(false);
      setError(err.message || "Error al conectar con el servidor de la API");
    }
  }

  return (
    <PantallaFormulario>
      <Text style={styles.title}>Nuevo Gasto</Text>

      <Text style={styles.label}>MONTO</Text>
      <TextInput
        placeholder="$ 0"
        placeholderTextColor={colors.textSecondary}
        value={valor}
        onChangeText={setValor}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>CATEGORÍA</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={categoriaId}
          onValueChange={setCategoriaId}
          style={{ color: colors.textPrimary }}
          dropdownIconColor={colors.textPrimary}
        >
          {categorias.map((cat) => (
            <Picker.Item key={cat.id} label={cat.nombre} value={cat.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>DESCRIPCIÓN</Text>
      <TextInput
        placeholder="Ej. Almuerzo en restaurante"
        placeholderTextColor={colors.textSecondary}
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
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
          {cargando ? "Guardando y analizando..." : "Guardar Gasto"}
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
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
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
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
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
