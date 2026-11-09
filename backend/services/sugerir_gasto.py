from repositories import gastos as gastos_repo
from repositories import ingresos as ingresos_repo
from repositories import categorias as categorias_repo
from services import gestion_metas
from datetime import date, datetime
from typing import Optional, Dict, List, Any
import math

PALABRAS_GASTO_HORMIGA = {
    "café", "cafe", "tinto", "snack", "dulce", "golosina", "chicle",
    "gaseosa", "empanada", "propina", "domicilio", "mecato", "paquete",
    "antojo", "cerveza", "cigarro", "helado", "postre", "panadería",
    "panaderia", "chucherias", "gominolas", "chupeta", "jugo"
}

UMBRAL_GASTO_HORMIGA_MAX = 25000.0  # Montos menores a $25.000 COP

def _es_gasto_hormiga(valor: float, descripcion: Optional[str], cat_nombre: str, cat_prioridad: str) -> bool:
    """
    Identifica de forma algorítmica si un gasto califica como 'gasto hormiga'
    (micro-gasto no esencial recurrente).
    """
    desc_limpia = (descripcion or "").lower()
    
    # 1. Por palabras clave explícitas
    for palabra in PALABRAS_GASTO_HORMIGA:
        if palabra in desc_limpia:
            return True
            
    # 2. Por monto pequeño en categorías no esenciales (Ocio u Otros)
    if valor <= UMBRAL_GASTO_HORMIGA_MAX and cat_prioridad in {"baja", "media"}:
        return True
        
    return False

def evaluar_gasto(client, jwt: str, gasto: dict) -> Dict[str, Any]:
    """
    Evalúa el gasto recién registrado aplicando:
    1. Detección algorítmica de 'gasto hormiga'.
    2. Evaluación de gastos innecesarios (regla 50/30/20 en deseos).
    3. Proyección predictiva mensual de ritmo de gasto.
    4. Diagnóstico de riesgo para metas de ahorro activas.
    """
    sugerencia: Optional[str] = None
    alerta: Optional[str] = None
    es_hormiga: bool = False
    gasto_innecesario: bool = False

    try:
        todos_gastos = gastos_repo.listar_gastos(client, jwt) or []
        todos_ingresos = ingresos_repo.listar_ingreso(client, jwt) or []
        metas = gestion_metas.obtener_metas(client, jwt) or []
        categorias = categorias_repo.listar_categorias(client, jwt) or []
        
        mapa_categorias = {str(c.get("id")): c for c in categorias}

        total_gastos = sum(float(g.get("valor", 0)) for g in todos_gastos)
        total_ingresos = sum(float(i.get("valor", 0)) for i in todos_ingresos)
        saldo_disponible = total_ingresos - total_gastos

        valor_gasto = float(gasto.get("valor", 0))
        cat_id = str(gasto.get("categoria_id"))
        cat_info = mapa_categorias.get(cat_id, {})
        cat_nombre = cat_info.get("nombre", "Otros")
        cat_prio = cat_info.get("prioridad", "media")
        descripcion = gasto.get("descripcion", "")

        # 1. Comprobar si es gasto hormiga
        if _es_gasto_hormiga(valor_gasto, descripcion, cat_nombre, cat_prio):
            es_hormiga = True

        # 2. Contabilizar gastos hormiga acumulados del mes
        gastos_hormiga_acumulados = [
            g for g in todos_gastos
            if _es_gasto_hormiga(
                float(g.get("valor", 0)),
                g.get("descripcion"),
                mapa_categorias.get(str(g.get("categoria_id")), {}).get("nombre", ""),
                mapa_categorias.get(str(g.get("categoria_id")), {}).get("prioridad", "media")
            )
        ]
        total_hormiga = sum(float(g.get("valor", 0)) for g in gastos_hormiga_acumulados)
        cantidad_hormiga = len(gastos_hormiga_acumulados)

        # 3. Metas activas y cuotas pendientes
        metas_activas = [m for m in metas if m.get("estado") == "por_cumplir"]
        suma_cuotas_metas = sum(float(m.get("cuota_sugerida", 0)) for m in metas_activas)
        primera_meta = metas_activas[0] if metas_activas else None

        # 4. Cálculo de gastos en Deseos vs Necesidades
        gastos_deseos = 0.0
        for g in todos_gastos:
            prio = mapa_categorias.get(str(g.get("categoria_id")), {}).get("prioridad", "media")
            if prio in {"baja", "media"}:
                gastos_deseos += float(g.get("valor", 0))

        limite_deseos_30 = total_ingresos * 0.30 if total_ingresos > 0 else 0.0
        if cat_prio in {"baja", "media"} and limite_deseos_30 > 0 and gastos_deseos > limite_deseos_30:
            gasto_innecesario = True

        # 5. Proyección algorítmica mensual (run-rate diario)
        hoy = date.today()
        dia_del_mes = max(1, hoy.day)
        gasto_diario_promedio = total_gastos / dia_del_mes
        proyeccion_fin_mes = gasto_diario_promedio * 30

        # Construcción de alertas y sugerencias predictivas:
        mensajes_alerta = []
        mensajes_sugerencia = []

        # Caso A: Alerta de Gasto Hormiga
        if es_hormiga:
            mensajes_alerta.append(
                f"🐜 Aviso de Gasto Hormiga: Este desembolso (${valor_gasto:,.0f}) parece pequeño, "
                f"pero ya acumulas ${total_hormiga:,.0f} en {cantidad_hormiga} micro-gastos este mes."
            )
            if primera_meta:
                dias_acelerados = math.ceil(total_hormiga / (float(primera_meta.get("cuota_sugerida", 1)) / 30)) if float(primera_meta.get("cuota_sugerida", 0)) > 0 else 15
                mensajes_sugerencia.append(
                    f"💡 Si optimizas estos micro-gastos, podrías abonar más a tu meta '{primera_meta.get('nombre')}' "
                    f"y alcanzarla aproximadamente {min(60, max(5, dias_acelerados))} días antes."
                )

        # Caso B: Alerta de Gasto Innecesario / Deseos excedidos
        if gasto_innecesario:
            mensajes_alerta.append(
                f"⚠️ Gasto Prescindible / Deseo Excedido: Has sobrepasado el 30% recomendado para compras secundarias "
                f"(${gastos_deseos:,.0f} de ${limite_deseos_30:,.0f} permitidos)."
            )
            mensajes_sugerencia.append(
                "Prioriza cubrir primero tus necesidades básicas y compromisos de ahorro antes de realizar más compras no esenciales."
            )

        # Caso C: Metas en riesgo
        if metas_activas and saldo_disponible < suma_cuotas_metas:
            mensajes_alerta.append(
                f"🚨 Metas en Riesgo: Tu saldo disponible restante (${saldo_disponible:,.0f}) "
                f"es menor a la cuota requerida (${suma_cuotas_metas:,.0f}) para tus metas del mes."
            )
            if primera_meta and not es_hormiga:
                mensajes_sugerencia.append(
                    f"Para proteger tu meta '{primera_meta.get('nombre')}', sugerimos pausar gastos en ocio y compras secundarias."
                )

        # Caso D: Proyección mensual que excede ingresos
        elif total_ingresos > 0 and proyeccion_fin_mes > total_ingresos:
            exceso = proyeccion_fin_mes - total_ingresos
            mensajes_alerta.append(
                f"📈 Proyección Predictiva: Al ritmo actual (${gasto_diario_promedio:,.0f}/día), "
                f"proyectas gastar ${proyeccion_fin_mes:,.0f} a fin de mes, excediendo tus ingresos por ${exceso:,.0f}."
            )
            mensajes_sugerencia.append(
                "Reduce tu gasto diario promedio en un 15% para equilibrar tu balance antes de fin de mes."
            )

        # Caso E: En buen camino
        elif total_ingresos > 0:
            porcentaje_gastado = (total_gastos / total_ingresos) * 100
            mensajes_sugerencia.append(
                f"✅ Vas por buen camino: Has consumido el {porcentaje_gastado:.1f}% de tus ingresos totales. "
                "Mantén tus gastos esenciales por debajo del 50% y reserva el 20% para tu ahorro."
            )
        else:
            mensajes_sugerencia.append(
                "Registra tus ingresos mensuales para activar todas las predicciones y recomendaciones de la regla 50/30/20."
            )

        alerta = "\n\n".join(mensajes_alerta) if mensajes_alerta else None
        sugerencia = "\n\n".join(mensajes_sugerencia) if mensajes_sugerencia else None

    except Exception:
        sugerencia = "Gasto registrado. Recuerda mantener un control balanceado de tus gastos."

    return {
        "sugerencia": sugerencia,
        "alerta": alerta,
        "es_gasto_hormiga": es_hormiga,
        "es_innecesario": gasto_innecesario
    }

def obtener_analisis_algoritmico(client, jwt: str) -> Dict[str, Any]:
    """
    Genera un informe analítico y predictivo integral para la pantalla de Reportes / Home.
    """
    todos_gastos = gastos_repo.listar_gastos(client, jwt) or []
    todos_ingresos = ingresos_repo.listar_ingreso(client, jwt) or []
    metas = gestion_metas.obtener_metas(client, jwt) or []
    categorias = categorias_repo.listar_categorias(client, jwt) or []

    mapa_categorias = {str(c.get("id")): c for c in categorias}

    total_gastos = sum(float(g.get("valor", 0)) for g in todos_gastos)
    total_ingresos = sum(float(i.get("valor", 0)) for i in todos_ingresos)
    saldo_disponible = total_ingresos - total_gastos

    # 1. Gastos hormiga
    gastos_hormiga = []
    for g in todos_gastos:
        c_info = mapa_categorias.get(str(g.get("categoria_id")), {})
        if _es_gasto_hormiga(float(g.get("valor", 0)), g.get("descripcion"), c_info.get("nombre", ""), c_info.get("prioridad", "media")):
            gastos_hormiga.append(g)

    total_hormiga = sum(float(g.get("valor", 0)) for g in gastos_hormiga)
    cantidad_hormiga = len(gastos_hormiga)

    # 2. Desglose 50/30/20
    gastos_necesidades = 0.0
    gastos_deseos = 0.0
    for g in todos_gastos:
        prio = mapa_categorias.get(str(g.get("categoria_id")), {}).get("prioridad", "media")
        val = float(g.get("valor", 0))
        if prio == "alta":
            gastos_necesidades += val
        else:
            gastos_deseos += val

    limite_50 = total_ingresos * 0.50
    limite_30 = total_ingresos * 0.30
    meta_20 = total_ingresos * 0.20

    # 3. Proyección predictiva mensual
    hoy = date.today()
    dia = max(1, hoy.day)
    promedio_diario = total_gastos / dia
    proyeccion_mes = promedio_diario * 30

    # 4. Gastos frecuentes (top categorías y conceptos)
    conteo_categorias: Dict[str, Dict[str, Any]] = {}
    for g in todos_gastos:
        c_id = str(g.get("categoria_id"))
        c_nom = mapa_categorias.get(c_id, {}).get("nombre", "Otros")
        if c_nom not in conteo_categorias:
            conteo_categorias[c_nom] = {"nombre": c_nom, "total": 0.0, "cantidad": 0}
        conteo_categorias[c_nom]["total"] += float(g.get("valor", 0))
        conteo_categorias[c_nom]["cantidad"] += 1

    top_categorias = sorted(conteo_categorias.values(), key=lambda x: x["total"], reverse=True)

    # Impacto en la meta más próxima
    metas_activas = [m for m in metas if m.get("estado") == "por_cumplir"]
    primera_meta = metas_activas[0] if metas_activas else None
    impacto_hormiga_meta = ""
    if primera_meta and total_hormiga > 0:
        cuota = float(primera_meta.get("cuota_sugerida", 0))
        if cuota > 0:
            meses_adelanto = round(total_hormiga / cuota, 1)
            impacto_hormiga_meta = f"Ahorrando tus gastos hormiga (${total_hormiga:,.0f}), podrías adelantar {meses_adelanto} cuota(s) de tu meta '{primera_meta.get('nombre')}'."

    return {
        "resumen": {
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos,
            "saldo_disponible": saldo_disponible,
        },
        "regla_50_30_20": {
            "necesidades": {
                "gastado": gastos_necesidades,
                "limite": limite_50,
                "porcentaje": round((gastos_necesidades / limite_50 * 100), 1) if limite_50 > 0 else 0,
                "excedido": gastos_necesidades > limite_50,
            },
            "deseos": {
                "gastado": gastos_deseos,
                "limite": limite_30,
                "porcentaje": round((gastos_deseos / limite_30 * 100), 1) if limite_30 > 0 else 0,
                "excedido": gastos_deseos > limite_30,
            },
            "ahorro": {
                "acumulado": max(0.0, saldo_disponible),
                "meta": meta_20,
                "porcentaje": round((saldo_disponible / meta_20 * 100), 1) if meta_20 > 0 and saldo_disponible > 0 else 0,
                "cumplido": saldo_disponible >= meta_20,
            },
        },
        "gastos_hormiga": {
            "total": total_hormiga,
            "cantidad": cantidad_hormiga,
            "proyeccion_anual": total_hormiga * 12,
            "impacto_meta": impacto_hormiga_meta,
        },
        "proyeccion_mensual": {
            "promedio_diario": promedio_diario,
            "proyeccion_fin_mes": proyeccion_mes,
            "excede_ingresos": proyeccion_mes > total_ingresos if total_ingresos > 0 else False,
            "diferencia": abs(total_ingresos - proyeccion_mes),
        },
        "top_categorias": top_categorias,
    }
