import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { formatearFechaCO, obtenerHoyCO } from "@/utils/date";

export interface DatosExportacion {
  usuarioNombre?: string;
  totalIngresos: number;
  totalGastos: number;
  saldoDisponible: number;
  gastosAlta: number;
  gastosMediaBaja: number;
  target50: number;
  target30: number;
  target20: number;
  gastos: Array<{
    fecha: string;
    categoria: string;
    descripcion?: string | null;
    valor: number;
  }>;
  ingresos: Array<{
    fecha: string;
    descripcion?: string | null;
    valor: number;
  }>;
  metas: Array<{
    nombre: string;
    valor_objetivo: number;
    aportado: number;
    fecha_objetivo: string;
    estado?: string;
  }>;
  gastosHormigaTotal?: number;
  proyeccionFinMes?: number;
}

/**
 * Genera el contenido de una planilla CSV compatible con Microsoft Excel (UTF-8 con BOM y separador punto y coma).
 */
export function generarCSV(datos: DatosExportacion): string {
  const hoy = obtenerHoyCO();
  const lineas: string[] = [];

  // BOM para que Excel reconozca tildes en Windows/Mac
  lineas.push("\uFEFF");

  // Encabezado principal
  lineas.push("REPORTE FINANCIERO - CENY APP");
  lineas.push(`Usuario:;${datos.usuarioNombre || "Usuario"}`);
  lineas.push(`Fecha de Emisión:;${hoy}`);
  lineas.push("");

  // Resumen General
  lineas.push("RESUMEN FINANCIERO GENERAL;Monto (COP)");
  lineas.push(`Total Ingresos:;$ ${datos.totalIngresos.toLocaleString("es-CO")}`);
  lineas.push(`Total Gastos:;$ ${datos.totalGastos.toLocaleString("es-CO")}`);
  lineas.push(`Saldo Disponible:;$ ${datos.saldoDisponible.toLocaleString("es-CO")}`);
  if (datos.gastosHormigaTotal !== undefined) {
    lineas.push(`Micro-gastos Hormiga:;$ ${datos.gastosHormigaTotal.toLocaleString("es-CO")}`);
  }
  if (datos.proyeccionFinMes !== undefined) {
    lineas.push(`Gasto Mensual Proyectado:;$ ${datos.proyeccionFinMes.toLocaleString("es-CO")}`);
  }
  lineas.push("");

  // Regla 50/30/20
  lineas.push("DISTRIBUCIÓN REGLA 50/30/20;Gastado (COP);Límite / Meta (COP);Estado");
  lineas.push(
    `50% Necesidades Básicas;${datos.gastosAlta};${datos.target50};${
      datos.gastosAlta > datos.target50 ? "Excedido" : "En presupuesto"
    }`
  );
  lineas.push(
    `30% Deseos y Estilo de Vida;${datos.gastosMediaBaja};${datos.target30};${
      datos.gastosMediaBaja > datos.target30 ? "Excedido" : "En presupuesto"
    }`
  );
  lineas.push(
    `20% Ahorro e Inversión;${Math.max(0, datos.saldoDisponible)};${datos.target20};${
      datos.saldoDisponible >= datos.target20 ? "Cumplido" : "Por alcanzar"
    }`
  );
  lineas.push("");

  // Metas de Ahorro
  lineas.push("METAS DE AHORRO;Aportado (COP);Objetivo (COP);Progreso;Fecha Límite;Estado");
  datos.metas.forEach((m) => {
    const progreso = m.valor_objetivo > 0 ? Math.round((m.aportado / m.valor_objetivo) * 100) : 0;
    lineas.push(
      `"${m.nombre}";${m.aportado};${m.valor_objetivo};${progreso}%;${formatearFechaCO(
        m.fecha_objetivo
      )};${m.estado || "En progreso"}`
    );
  });
  lineas.push("");

  // Detalle de Gastos
  lineas.push("DETALLE DE GASTOS;Fecha (DD/MM/AAAA);Categoría;Descripción;Valor (COP)");
  datos.gastos.forEach((g) => {
    lineas.push(
      `;${formatearFechaCO(g.fecha)};"${g.categoria}";"${(g.descripcion || "").replace(
        /"/g,
        '""'
      )}";${g.valor}`
    );
  });
  lineas.push("");

  // Detalle de Ingresos
  lineas.push("DETALLE DE INGRESOS;Fecha (DD/MM/AAAA);Concepto;Valor (COP)");
  datos.ingresos.forEach((i) => {
    lineas.push(
      `;${formatearFechaCO(i.fecha)};"${(i.descripcion || "Ingreso").replace(
        /"/g,
        '""'
      )}";${i.valor}`
    );
  });

  return lineas.join("\n");
}

/**
 * Genera un resumen ejecutivo en texto claro para compartir por WhatsApp, Correo o Mensajería.
 */
export function generarTextoReporte(datos: DatosExportacion): string {
  const hoy = obtenerHoyCO();
  return `📊 REPORTE FINANCIERO CENY (${hoy})
Usuario: ${datos.usuarioNombre || "Usuario"}

💰 BALANCE:
• Ingresos: $${datos.totalIngresos.toLocaleString("es-CO")}
• Gastos: $${datos.totalGastos.toLocaleString("es-CO")}
• Saldo Disponible: $${datos.saldoDisponible.toLocaleString("es-CO")}

📐 REGLA 50/30/20:
• Necesidades (50%): $${datos.gastosAlta.toLocaleString("es-CO")} / $${datos.target50.toLocaleString("es-CO")} (${datos.gastosAlta > datos.target50 ? "⚠️ Excedido" : "✅ Al día"})
• Deseos (30%): $${datos.gastosMediaBaja.toLocaleString("es-CO")} / $${datos.target30.toLocaleString("es-CO")} (${datos.gastosMediaBaja > datos.target30 ? "⚠️ Excedido" : "✅ Al día"})
• Ahorro (20%): $${Math.max(0, datos.saldoDisponible).toLocaleString("es-CO")} / $${datos.target20.toLocaleString("es-CO")}

🎯 METAS ACTIVAS:
${
  datos.metas.length === 0
    ? "Sin metas activas."
    : datos.metas
        .map(
          (m) =>
            `• ${m.nombre}: $${m.aportado.toLocaleString("es-CO")} de $${m.valor_objetivo.toLocaleString("es-CO")} (${formatearFechaCO(m.fecha_objetivo)})`
        )
        .join("\n")
}

🐜 GASTOS HORMIGA:
${
  datos.gastosHormigaTotal
    ? `Total acumulado en micro-gastos: $${datos.gastosHormigaTotal.toLocaleString("es-CO")}`
    : "Sin gastos hormiga detectados."
}

Generado automáticamente por Ceny App - Control Financiero Inteligente.`;
}

/**
 * Exporta el archivo CSV abriendo la ventana de compartir o descargando el archivo según la plataforma.
 */
export async function exportarArchivoCSV(datos: DatosExportacion): Promise<void> {
  const contenido = generarCSV(datos);
  const nombreArchivo = `CENY_Reporte_${obtenerHoyCO().replace(/\//g, "-")}.csv`;

  if (Platform.OS === "web") {
    // Descarga directa en navegador Web
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // En dispositivo móvil (iOS / Android con Expo)
  try {
    const fileUri = `${FileSystem.cacheDirectory}${nombreArchivo}`;
    await FileSystem.writeAsStringAsync(fileUri, contenido, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Exportar Reporte a Excel (CSV)",
        UTI: "public.comma-separated-values-text",
      });
      return;
    }
  } catch (err) {
    // Fallback con Share nativo de React Native
  }

  await Share.share({
    title: "Reporte Financiero CENY",
    message: generarTextoReporte(datos),
  });
}

/**
 * Exporta o comparte el resumen ejecutivo formateado.
 */
export async function compartirResumen(datos: DatosExportacion): Promise<void> {
  const mensaje = generarTextoReporte(datos);
  if (Platform.OS === "web") {
    // En web, si el navegador soporta navigator.share, usarlo; de lo contrario copiar al portapapeles o imprimir
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Reporte Financiero CENY",
          text: mensaje,
        });
        return;
      } catch {
        // usuario canceló o error
      }
    }
    // Abrir ventana para imprimir en PDF
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte Financiero - CENY APP</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
              h1 { color: #0f172a; border-bottom: 2px solid #22c55e; padding-bottom: 10px; }
              pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; font-size: 14px; white-space: pre-wrap; line-height: 1.6; }
              button { background: #22c55e; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
              @media print { button { display: none; } }
            </style>
          </head>
          <body>
            <h1>Reporte Financiero - CENY APP</h1>
            <p><button onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button></p>
            <pre>${mensaje}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    return;
  }

  // En móvil
  await Share.share({
    title: "Reporte Financiero CENY",
    message: mensaje,
  });
}
