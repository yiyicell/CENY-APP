/**
 * Utilidades para manejo y formateo de fechas en formato colombiano (DD/MM/AAAA)
 */

export function formatearFechaCO(fechaStr?: string | Date | null): string {
  if (!fechaStr) return "";
  try {
    if (fechaStr instanceof Date) {
      const d = String(fechaStr.getDate()).padStart(2, "0");
      const m = String(fechaStr.getMonth() + 1).padStart(2, "0");
      const y = fechaStr.getFullYear();
      return `${d}/${m}/${y}`;
    }

    // Si viene en formato ISO (ej: 2026-10-27 o 2026-10-27T00:00:00Z)
    const soloFecha = String(fechaStr).split("T")[0];
    const partes = soloFecha.split("-");
    if (partes.length === 3 && partes[0].length === 4) {
      return `${partes[2].padStart(2, "0")}/${partes[1].padStart(2, "0")}/${partes[0]}`;
    }

    // Si ya viene con barras DD/MM/AAAA
    if (soloFecha.includes("/")) {
      return soloFecha;
    }
  } catch {
    // Retorno seguro en caso de formato imprevisto
  }
  return String(fechaStr);
}

/**
 * Convierte una fecha colombiana DD/MM/AAAA a formato estándar de base de datos AAAA-MM-DD
 */
export function convertirCOaISO(fechaCO: string): string {
  if (!fechaCO) return "";
  const limpia = fechaCO.trim();

  // Si ya está en AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
    return limpia;
  }

  // Si viene en DD/MM/AAAA o DD-MM-AAAA
  const partes = limpia.split(/[\/-]/);
  if (partes.length === 3) {
    if (partes[2].length === 4) {
      const dia = partes[0].padStart(2, "0");
      const mes = partes[1].padStart(2, "0");
      const anio = partes[2];
      return `${anio}-${mes}-${dia}`;
    }
    if (partes[0].length === 4) {
      const anio = partes[0];
      const mes = partes[1].padStart(2, "0");
      const dia = partes[2].padStart(2, "0");
      return `${anio}-${mes}-${dia}`;
    }
  }
  return limpia;
}

/**
 * Retorna la fecha actual en formato colombiano DD/MM/AAAA
 */
export function obtenerHoyCO(): string {
  const hoy = new Date();
  const d = String(hoy.getDate()).padStart(2, "0");
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const y = hoy.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Valida si un texto corresponde a una fecha válida DD/MM/AAAA o AAAA-MM-DD
 */
export function esFechaValida(fecha: string): boolean {
  if (!fecha) return false;
  const iso = convertirCOaISO(fecha);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dateObj = new Date(y, m - 1, d);
  return (
    dateObj.getFullYear() === y &&
    dateObj.getMonth() === m - 1 &&
    dateObj.getDate() === d
  );
}
