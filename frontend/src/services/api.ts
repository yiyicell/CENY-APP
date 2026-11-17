import { supabase } from "@/constants/supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseApiUrl(): string {
  // Si está definida una IP o URL específica en el entorno, usarla
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  // En Expo Go (dispositivo físico), extraer la IP de la máquina de hostUri automáticamente
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:8000`;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return envUrl || "http://localhost:8000";
}

export const API_URL = getBaseApiUrl();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  return {
    "Content-Type": "application/json",
    authorizacion: `Bearer ${token}`,
  };
}

export interface GastoPayload {
  categoria_id: string;
  valor: number;
  fecha_gasto: string;
  descripcion?: string | null;
  frecuencia?: string | null;
}

export interface GastoResponse {
  mensaje: string;
  gasto: any;
  sugerencia?: string | null;
  alerta?: string | null;
  es_gasto_hormiga?: boolean;
  es_innecesario?: boolean;
}

export async function registrarGastoAPI(gasto: GastoPayload): Promise<GastoResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/gastos`, {
    method: "POST",
    headers,
    body: JSON.stringify(gasto),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al registrar el gasto");
  }
  return data;
}

export async function obtenerGastosAPI() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/gastos`, {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al obtener los gastos");
  }
  return data;
}

export async function obtenerCategoriasAPI() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/categorias`, {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al obtener las categorías");
  }
  return data;
}

export async function obtenerIngresosAPI() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/ingresos`, {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al obtener los ingresos");
  }
  return data;
}

export async function registrarIngresoAPI(ingreso: {
  valor: number;
  fecha_ingreso: string;
  descripcion?: string | null;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/ingresos`, {
    method: "POST",
    headers,
    body: JSON.stringify(ingreso),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al registrar el ingreso");
  }
  return data;
}

export async function obtenerMetasAPI() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas`, {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al obtener las metas");
  }
  return data;
}

export async function registrarMetaAPI(meta: {
  nombre: string;
  valor_objetivo: number;
  frecuencia_ahorro: string;
  fecha_objetivo: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas`, {
    method: "POST",
    headers,
    body: JSON.stringify(meta),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al crear la meta");
  }
  return data;
}

export async function obtenerAnalisisAPI() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/gastos/analisis`, {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al obtener el análisis algorítmico");
  }
  return data;
}

export async function registrarAporteAPI(
  metaId: string,
  aporte: {
    valor: number;
    fecha_aporte: string;
  }
) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas/${metaId}/aportes`, {
    method: "POST",
    headers,
    body: JSON.stringify(aporte),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al registrar el aporte");
  }
  return data;
}

export interface MementoDTO {
  id: string;
  meta_id: string;
  index: number;
  monto_actual: number;
  estado: "EN_PROGRESO" | "COMPLETADA" | "CANCELADA";
  fecha_registro: string;
  nota?: string | null;
}

export async function obtenerMementosMetaAPI(metaId: string): Promise<MementoDTO[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas/${metaId}/mementos`, {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al obtener el historial Memento de la meta");
  }
  return data;
}

export async function guardarSnapshotMetaAPI(
  metaId: string,
  nota?: string
): Promise<MementoDTO> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas/${metaId}/mementos`, {
    method: "POST",
    headers,
    body: JSON.stringify({ nota: nota || "Punto de control manual" }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al guardar el snapshot de la meta");
  }
  return data;
}

export async function deshacerEstadoMetaAPI(metaId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas/${metaId}/deshacer`, {
    method: "POST",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "No se pudo deshacer el último cambio");
  }
  return data;
}

export async function restaurarMementoMetaAPI(metaId: string, index: number) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas/${metaId}/restaurar/${index}`, {
    method: "POST",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al restaurar el estado seleccionado");
  }
  return data;
}

export async function cambiarEstadoMetaAPI(
  metaId: string,
  estado: "EN_PROGRESO" | "COMPLETADA" | "CANCELADA"
) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/metas/${metaId}/estado`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al actualizar el estado de la meta");
  }
  return data;
}
