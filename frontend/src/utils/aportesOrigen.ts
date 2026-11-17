import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ceny_aportes_origen_v1";

export type OrigenAporte = "saldo" | "externo";

export async function obtenerOrigenesAportesLocal(): Promise<Record<string, OrigenAporte>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function guardarOrigenAporteLocal(
  aporteId: string,
  origen: OrigenAporte
): Promise<void> {
  if (!aporteId) return;
  try {
    const actuales = await obtenerOrigenesAportesLocal();
    actuales[String(aporteId)] = origen;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actuales));
  } catch {
    // Ignorar fallo de almacenamiento local si ocurre
  }
}
