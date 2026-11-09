import { useCallback, useState } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/constants/supabase";
import { colors } from "@/constants/theme";
import { PantallaFormulario } from "@/components/PantallaFormulario";
import { registrarGastoAPI, obtenerCategoriasAPI } from "@/services/api";
import { obtenerHoyCO, convertirCOaISO, esFechaValida } from "@/utils/date";

type Categoria = { id: string; nombre: string; prioridad?: string };

function generarUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const PALABRAS_HORMIGA = [
  "café", "cafe", "tinto", "snack", "dulce", "golosina", "chicle",
  "gaseosa", "empanada", "propina", "domicilio", "mecato", "antojo",
  "cerveza", "cigarro", "helado", "postre"
];

const SUGERENCIAS_RAPIDAS = [
  { nombre: "Almuerzo", monto: "15000", catNombre: "Alimentación" },
  { nombre: "Transporte", monto: "3200", catNombre: "Transporte" },
  { nombre: "Café / Snack", monto: "5000", catNombre: "Ocio" },
  { nombre: "Supermercado", monto: "80000", catNombre: "Alimentación" },
];

export default function NuevoGastoScreen() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(obtenerHoyCO());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      cargarCategorias();
    }, [])
  );

  async function cargarCategorias() {
    try {
      const data = await obtenerCategoriasAPI();
      if (Array.isArray(data) && data.length > 1) {
        setCategorias(data);
        if (!categoriaId) setCategoriaId(data[0].id);
        return;
      }
    } catch (e) {
      // Continuar con Supabase
    }

    const { data: categoriasDB } = await supabase
      .from("categorias")
      .select("id, nombre, prioridad");

    if (categoriasDB && categoriasDB.length > 1) {
      setCategorias(categoriasDB);
      if (!categoriaId) setCategoriaId(categoriasDB[0].id);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const uid = userData.user.id;
        const categoriasPorDefecto = [
          { id: generarUUID(), nombre: "Alimentación", prioridad: "alta", usuario_id: uid },
          { id: generarUUID(), nombre: "Transporte", prioridad: "alta", usuario_id: uid },
          { id: generarUUID(), nombre: "Vivienda", prioridad: "alta", usuario_id: uid },
          { id: generarUUID(), nombre: "Salud", prioridad: "alta", usuario_id: uid },
          { id: generarUUID(), nombre: "Ocio", prioridad: "baja", usuario_id: uid },
        ];
        await supabase.from("categorias").insert(categoriasPorDefecto);

        const { data: recargadas } = await supabase
          .from("categorias")
          .select("id, nombre, prioridad");

        if (recargadas && recargadas.length > 0) {
          setCategorias(recargadas);
          setCategoriaId(recargadas[0].id);
          return;
        }
      }
    } catch (err) {
      // Ignorar si falla la inserción
    }

    if (categoriasDB && categoriasDB.length > 0) {
      setCategorias(categoriasDB);
      if (!categoriaId) setCategoriaId(categoriasDB[0].id);
    }
  }

  // Detección algorítmica preventiva en vivo de gasto hormiga
  const montoNum = Number(valor) || 0;
  const descLimpia = descripcion.toLowerCase();
  const categoriaSeleccionada = categorias.find((c) => c.id === categoriaId);
  const esPotencialHormiga =
    (montoNum > 0 && montoNum <= 25000 && categoriaSeleccionada?.prioridad !== "alta") ||
    PALABRAS_HORMIGA.some((p) => descLimpia.includes(p));

  function aplicarSugerencia(sug: typeof SUGERENCIAS_RAPIDAS[0]) {
    setDescripcion(sug.nombre);
    setValor(sug.monto);
    const catEncontrada = categorias.find(
      (c) => c.nombre.toLowerCase() === sug.catNombre.toLowerCase()
    );
    if (catEncontrada) {
      setCategoriaId(catEncontrada.id);
    }
  }

  async function handleGuardar() {
    setError("");
    const monto = Number(valor);
    if (!monto || monto <= 0) {
      setError("Ingresa un monto válido mayor a 0");
      return;
    }
    if (!categoriaId) {
      setError("Selecciona una categoría");
      return;
    }
    if (!esFechaValida(fecha)) {
      setError("La fecha debe tener formato DD/MM/AAAA válido (ej: " + obtenerHoyCO() + ")");
      return;
    }

    setCargando(true);
    try {
      const fechaISO = convertirCOaISO(fecha);

      const res = await registrarGastoAPI({
        categoria_id: categoriaId,
        valor: monto,
        fecha_gasto: fechaISO,
        descripcion: descripcion.trim() || null,
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
      <Text style={styles.subtitulo}>
        Registra tu compra para evaluar su impacto en tu presupuesto 50/30/20 y tus metas.
      </Text>

      {/* Sugerencias Rápidas */}
      <Text style={styles.label}>SUGERENCIAS FRECUENTES</Text>
      <View style={styles.sugerenciasRow}>
        {SUGERENCIAS_RAPIDAS.map((sug) => (
          <TouchableOpacity
            key={sug.nombre}
            onPress={() => aplicarSugerencia(sug)}
            style={styles.chipSugerencia}
          >
            <Text style={styles.chipTexto}>{sug.nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>MONTO (COP)</Text>
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
          {categorias.map((cat) => {
            const etiquetaPrioridad =
              cat.prioridad === "alta"
                ? " (Necesidad - 50%)"
                : cat.prioridad === "baja"
                ? " (Deseo - 30%)"
                : " (Secundario)";
            return (
              <Picker.Item
                key={cat.id}
                label={`${cat.nombre}${etiquetaPrioridad}`}
                value={cat.id}
              />
            );
          })}
        </Picker>
      </View>

      <Text style={styles.label}>FECHA DEL GASTO (DD/MM/AAAA)</Text>
      <TextInput
        placeholder={obtenerHoyCO()}
        placeholderTextColor={colors.textSecondary}
        value={fecha}
        onChangeText={setFecha}
        autoCapitalize="none"
        style={styles.input}
      />

      <Text style={styles.label}>DESCRIPCIÓN</Text>
      <TextInput
        placeholder="Ej. Almuerzo ejecutivo, Transporte del día, Café"
        placeholderTextColor={colors.textSecondary}
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        style={[styles.input, { height: 75, textAlignVertical: "top" }]}
      />

      {/* Indicador algorítmico en vivo de Gasto Hormiga */}
      {esPotencialHormiga && (
        <View style={styles.avisoHormiga}>
          <Text style={styles.avisoHormigaTexto}>
            🐜 <Text style={{ fontWeight: "700" }}>Aviso predictivo:</Text> Este gasto parece ser un micro-gasto (gasto hormiga). Reducir estas compras frecuentes te permitirá destinar más dinero a tus metas.
          </Text>
        </View>
      )}

      {error ? (
        <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={handleGuardar}
        disabled={cargando}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {cargando ? "Guardando y evaluando..." : "Guardar Gasto"}
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
    fontSize: 13,
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 6,
    fontWeight: "600",
  },
  sugerenciasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  chipSugerencia: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipTexto: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "500",
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
  avisoHormiga: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  avisoHormigaTexto: {
    color: "#F59E0B",
    fontSize: 12,
    lineHeight: 18,
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
