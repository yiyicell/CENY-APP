import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as XLSX from "xlsx";
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
 * Genera un libro de Microsoft Excel (.xlsx) con múltiples hojas estructuradas.
 */
export async function exportarExcelXLSX(datos: DatosExportacion): Promise<void> {
  const hoy = obtenerHoyCO();
  const nombreArchivo = `CENY_Informe_Financiero_${hoy.replace(/\//g, "-")}.xlsx`;

  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen General
  const filasResumen = [
    ["INFORME FINANCIERO EJECUTIVO - CENY APP"],
    ["Usuario:", datos.usuarioNombre || "Usuario"],
    ["Fecha de Emision:", hoy],
    [],
    ["INDICADOR FINANCIERO", "VALOR (COP)"],
    ["Ingresos Totales", datos.totalIngresos],
    ["Gastos Totales", datos.totalGastos],
    ["Saldo Disponible Neto", datos.saldoDisponible],
    ["Microgastos Hormiga Acumulados", datos.gastosHormigaTotal || 0],
    ["Gasto Mensual Proyectado", datos.proyeccionFinMes || 0],
    [],
    ["DISTRIBUCION REGLA 50/30/20", "GASTO REAL (COP)", "LIMITE PREVISTO (COP)", "ESTADO"],
    [
      "50% Necesidades Basicas",
      datos.gastosAlta,
      datos.target50,
      datos.gastosAlta > datos.target50 ? "Excedido" : "En margen",
    ],
    [
      "30% Deseos y Consumo Discrecional",
      datos.gastosMediaBaja,
      datos.target30,
      datos.gastosMediaBaja > datos.target30 ? "Excedido" : "En margen",
    ],
    [
      "20% Ahorro e Inversion",
      Math.max(0, datos.saldoDisponible),
      datos.target20,
      datos.saldoDisponible >= datos.target20 ? "Cumplido" : "Por alcanzar",
    ],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");

  // Hoja 2: Detalle de Gastos
  const filasGastos = [
    ["Fecha (DD/MM/AAAA)", "Categoria", "Descripcion", "Valor (COP)"],
    ...datos.gastos.map((g) => [
      formatearFechaCO(g.fecha),
      g.categoria,
      g.descripcion || "",
      g.valor,
    ]),
  ];
  const wsGastos = XLSX.utils.aoa_to_sheet(filasGastos);
  XLSX.utils.book_append_sheet(wb, wsGastos, "Detalle Gastos");

  // Hoja 3: Detalle de Ingresos
  const filasIngresos = [
    ["Fecha (DD/MM/AAAA)", "Concepto", "Valor (COP)"],
    ...datos.ingresos.map((i) => [
      formatearFechaCO(i.fecha),
      i.descripcion || "Ingreso registrado",
      i.valor,
    ]),
  ];
  const wsIngresos = XLSX.utils.aoa_to_sheet(filasIngresos);
  XLSX.utils.book_append_sheet(wb, wsIngresos, "Detalle Ingresos");

  // Hoja 4: Metas de Ahorro
  const filasMetas = [
    [
      "Nombre de la Meta",
      "Valor Objetivo (COP)",
      "Total Aportado (COP)",
      "Porcentaje Cumplimiento",
      "Fecha Limite (DD/MM/AAAA)",
      "Estado",
    ],
    ...datos.metas.map((m) => [
      m.nombre,
      m.valor_objetivo,
      m.aportado,
      `${m.valor_objetivo > 0 ? Math.round((m.aportado / m.valor_objetivo) * 100) : 0}%`,
      formatearFechaCO(m.fecha_objetivo),
      m.estado || "En progreso",
    ]),
  ];
  const wsMetas = XLSX.utils.aoa_to_sheet(filasMetas);
  XLSX.utils.book_append_sheet(wb, wsMetas, "Metas de Ahorro");

  if (Platform.OS === "web") {
    // Descarga directa en navegador Web como archivo .xlsx genuino
    XLSX.writeFile(wb, nombreArchivo);
    return;
  }

  // En dispositivo móvil (iOS / Android)
  try {
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const fileUri = `${FileSystem.cacheDirectory}${nombreArchivo}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Abrir o compartir hoja de calculo Excel",
        UTI: "com.microsoft.excel.xlsx",
      });
      return;
    }
  } catch (err) {
    // Fallback genérico si Sharing no responde
  }

  await Share.share({
    title: "Informe Financiero CENY",
    message: generarTextoReporteFormal(datos),
  });
}

/**
 * Genera el documento HTML profesional para convertir a archivo PDF imprimible.
 */
export function generarHTMLReporte(datos: DatosExportacion): string {
  const hoy = obtenerHoyCO();

  const filasGastosHTML = datos.gastos
    .slice(0, 30)
    .map(
      (g) => `
      <tr>
        <td>${formatearFechaCO(g.fecha)}</td>
        <td>${g.categoria}</td>
        <td>${g.descripcion || "-"}</td>
        <td style="text-align: right;">$ ${g.valor.toLocaleString("es-CO")}</td>
      </tr>`
    )
    .join("");

  const filasMetasHTML = datos.metas
    .map((m) => {
      const pct = m.valor_objetivo > 0 ? Math.round((m.aportado / m.valor_objetivo) * 100) : 0;
      return `
      <tr>
        <td><strong>${m.nombre}</strong></td>
        <td style="text-align: right;">$ ${m.aportado.toLocaleString("es-CO")}</td>
        <td style="text-align: right;">$ ${m.valor_objetivo.toLocaleString("es-CO")}</td>
        <td style="text-align: center;">${pct}%</td>
        <td>${formatearFechaCO(m.fecha_objetivo)}</td>
        <td>${m.estado === "cumplido" ? "Cumplida" : "En progreso"}</td>
      </tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Financiero - CENY APP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 24px;
          background: #ffffff;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 20px;
          color: #0f172a;
          margin: 0 0 6px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header .meta {
          font-size: 12px;
          color: #64748b;
        }
        .kpi-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .kpi-card {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 12px;
          background: #f8fafc;
        }
        .kpi-title {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 17px;
          font-weight: bold;
          color: #0f172a;
        }
        .section-title {
          font-size: 14px;
          color: #0f172a;
          font-weight: bold;
          margin: 18px 0 8px 0;
          text-transform: uppercase;
          border-left: 3px solid #0284c7;
          padding-left: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 7px 10px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 600;
        }
        .notice-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #f59e0b;
          padding: 10px 14px;
          font-size: 12px;
          color: #334155;
          margin-bottom: 16px;
          border-radius: 4px;
        }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #94a3b8;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Informe de Control Financiero y Presupuesto</h1>
        <div class="meta">
          <strong>Usuario:</strong> ${datos.usuarioNombre || "Usuario"} &nbsp;|&nbsp; 
          <strong>Fecha de emision:</strong> ${hoy} &nbsp;|&nbsp; 
          <strong>Moneda:</strong> COP (Pesos Colombianos)
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">Ingresos Totales</div>
          <div class="kpi-value">$ ${datos.totalIngresos.toLocaleString("es-CO")}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Gastos Totales</div>
          <div class="kpi-value">$ ${datos.totalGastos.toLocaleString("es-CO")}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Saldo Disponible Neto</div>
          <div class="kpi-value">$ ${datos.saldoDisponible.toLocaleString("es-CO")}</div>
        </div>
      </div>

      <div class="section-title">Distribucion Presupuestal (Regla 50 / 30 / 20)</div>
      <table>
        <thead>
          <tr>
            <th>Rubro</th>
            <th>Gasto Real (COP)</th>
            <th>Limite Recomendado (COP)</th>
            <th>Porcentaje Ejecutado</th>
            <th>Diagnostico</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Necesidades Basicas (50%)</td>
            <td>$ ${datos.gastosAlta.toLocaleString("es-CO")}</td>
            <td>$ ${datos.target50.toLocaleString("es-CO")}</td>
            <td>${datos.target50 > 0 ? Math.round((datos.gastosAlta / datos.target50) * 100) : 0}%</td>
            <td>${datos.gastosAlta > datos.target50 ? "Excede el limite recomendado" : "Dentro de margen planificado"}</td>
          </tr>
          <tr>
            <td>Deseos y Ocio (30%)</td>
            <td>$ ${datos.gastosMediaBaja.toLocaleString("es-CO")}</td>
            <td>$ ${datos.target30.toLocaleString("es-CO")}</td>
            <td>${datos.target30 > 0 ? Math.round((datos.gastosMediaBaja / datos.target30) * 100) : 0}%</td>
            <td>${datos.gastosMediaBaja > datos.target30 ? "Excede el limite recomendado" : "Dentro de margen planificado"}</td>
          </tr>
          <tr>
            <td>Ahorro e Inversion (20%)</td>
            <td>$ ${Math.max(0, datos.saldoDisponible).toLocaleString("es-CO")}</td>
            <td>$ ${datos.target20.toLocaleString("es-CO")}</td>
            <td>${datos.target20 > 0 ? Math.round((Math.max(0, datos.saldoDisponible) / datos.target20) * 100) : 0}%</td>
            <td>${datos.saldoDisponible >= datos.target20 ? "Objetivo alcanzado" : "En proceso de acumulacion"}</td>
          </tr>
        </tbody>
      </table>

      ${
        datos.gastosHormigaTotal
          ? `
      <div class="notice-box">
        <strong>Auditoria de Microgastos (Gastos Hormiga):</strong><br>
        Se han registrado salidas acumuladas por <strong>$ ${datos.gastosHormigaTotal.toLocaleString(
          "es-CO"
        )}</strong> en compras de bajo monto. La reduccion programada de estos desembolsos optimiza la capacidad de capital para tus metas de ahorro prioritarias.
      </div>`
          : ""
      }

      <div class="section-title">Seguimiento de Metas de Ahorro</div>
      ${
        datos.metas.length === 0
          ? "<p style='font-size: 12px; color: #64748b;'>No existen metas de ahorro registradas en el periodo.</p>"
          : `
      <table>
        <thead>
          <tr>
            <th>Meta</th>
            <th>Aportado (COP)</th>
            <th>Objetivo (COP)</th>
            <th>Progreso</th>
            <th>Fecha Limite</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filasMetasHTML}
        </tbody>
      </table>`
      }

      <div class="section-title">Registro Reciente de Gastos</div>
      ${
        datos.gastos.length === 0
          ? "<p style='font-size: 12px; color: #64748b;'>No se registran gastos en el periodo.</p>"
          : `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Categoria</th>
            <th>Descripcion</th>
            <th>Monto (COP)</th>
          </tr>
        </thead>
        <tbody>
          ${filasGastosHTML}
        </tbody>
      </table>`
      }

      <div class="footer">
        Documento generado por Ceny App - Sistema de Informacion y Planificacion Financiera Personal
      </div>
    </body>
    </html>
  `;
}

/**
 * Exporta el archivo PDF formal utilizando expo-print y expo-sharing.
 */
export async function exportarPDF(datos: DatosExportacion): Promise<void> {
  const html = generarHTMLReporte(datos);

  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }

  // En dispositivo móvil (iOS / Android)
  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Guardar o compartir informe PDF",
      UTI: "com.adobe.pdf",
    });
  } catch (err: any) {
    await Share.share({
      title: "Informe Financiero CENY",
      message: generarTextoReporteFormal(datos),
    });
  }
}

/**
 * Genera el resumen formal sin emojis.
 */
export function generarTextoReporteFormal(datos: DatosExportacion): string {
  const hoy = obtenerHoyCO();
  return `INFORME FINANCIERO EJECUTIVO - CENY APP
Fecha de emision: ${hoy}
Usuario: ${datos.usuarioNombre || "Usuario"}

1. RESUMEN DE BALANCE GENERAL:
- Ingresos Totales: $ ${datos.totalIngresos.toLocaleString("es-CO")}
- Gastos Totales: $ ${datos.totalGastos.toLocaleString("es-CO")}
- Saldo Disponible Neto: $ ${datos.saldoDisponible.toLocaleString("es-CO")}

2. DISTRIBUCION REGLA 50/30/20:
- Necesidades Basicas (50%): $ ${datos.gastosAlta.toLocaleString("es-CO")} de $ ${datos.target50.toLocaleString("es-CO")} (${
    datos.gastosAlta > datos.target50 ? "Excedido" : "En margen"
  })
- Deseos y Ocio (30%): $ ${datos.gastosMediaBaja.toLocaleString("es-CO")} de $ ${datos.target30.toLocaleString("es-CO")} (${
    datos.gastosMediaBaja > datos.target30 ? "Excedido" : "En margen"
  })
- Ahorro e Inversion (20%): $ ${Math.max(0, datos.saldoDisponible).toLocaleString("es-CO")} de $ ${datos.target20.toLocaleString("es-CO")}

3. METAS DE AHORRO:
${
  datos.metas.length === 0
    ? "No se registran metas de ahorro."
    : datos.metas
        .map(
          (m) =>
            `- ${m.nombre}: $ ${m.aportado.toLocaleString("es-CO")} de $ ${m.valor_objetivo.toLocaleString("es-CO")} (Limite: ${formatearFechaCO(m.fecha_objetivo)})`
        )
        .join("\n")
}

4. AUDITORIA DE MICROGASTOS (GASTOS HORMIGA):
${
  datos.gastosHormigaTotal
    ? `Total acumulado en microgastos: $ ${datos.gastosHormigaTotal.toLocaleString("es-CO")}`
    : "Sin microgastos detectados en el periodo."
}

Documento emitido por el sistema Ceny App.`;
}
