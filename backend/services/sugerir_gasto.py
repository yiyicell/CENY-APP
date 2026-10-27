from repositories import gastos as gastos_repo
from repositories import ingresos as ingresos_repo
from repositories import categorias as categorias_repo
from services import gestion_metas
from typing import Optional, Dict

def evaluar_gasto(client, jwt: str, gasto: dict) -> Dict[str, Optional[str]]:
    """
    Evalúa el gasto recién registrado conforme al Diagrama de Secuencia y Reglas del Sistema:
    1. Consulta historial de ingresos y gastos.
    2. Consulta metas activas y sus cuotas pendientes.
    3. Aplica regla 50/30/20 y evalúa si compromete metas activas.
    4. Genera sugerencias y alertas financieras claras.
    """
    sugerencia: Optional[str] = None
    alerta: Optional[str] = None

    try:
        # 1. Obtener historial
        todos_gastos = gastos_repo.listar_gastos(client, jwt) or []
        todos_ingresos = ingresos_repo.listar_ingreso(client, jwt) or []
        metas = gestion_metas.obtener_metas(client, jwt) or []

        total_gastos = sum(float(g.get("valor", 0)) for g in todos_gastos)
        total_ingresos = sum(float(i.get("valor", 0)) for i in todos_ingresos)
        saldo_disponible = total_ingresos - total_gastos

        # 2. Obtener metas activas
        metas_activas = [m for m in metas if m.get("estado") == "por_cumplir"]
        suma_cuotas_metas = sum(float(m.get("cuota_sugerida", 0)) for m in metas_activas)

        # 3. Evaluar si el gasto pone en riesgo las metas activas
        if metas_activas and saldo_disponible < suma_cuotas_metas:
            primera_meta = metas_activas[0]
            alerta = (
                f"Atención: Tu saldo disponible restante (${saldo_disponible:,.2f}) "
                f"es inferior a la cuota requerida (${suma_cuotas_metas:,.2f}) para tus metas activas."
            )
            sugerencia = (
                f"Para no comprometer tu meta '{primera_meta.get('nombre')}', "
                f"te sugerimos reducir gastos en categorías de prioridad media o baja durante este período."
            )
        elif total_ingresos > 0:
            porcentaje_gastado = (total_gastos / total_ingresos) * 100
            # Regla 50/30/20: Gastos totales no deberían superar el 80% (50% necesidades + 30% deseos)
            if porcentaje_gastado > 80:
                alerta = (
                    f"Has utilizado el {porcentaje_gastado:.1f}% de tus ingresos totales. "
                    f"Superas el límite recomendado del 80% (Regla 50/30/20)."
                )
                sugerencia = (
                    "Se recomienda destinar al menos el 20% de tus ingresos al ahorro. "
                    "Evita compras no esenciales en los próximos días."
                )
            else:
                sugerencia = (
                    f"Vas por buen camino. Has consumido el {porcentaje_gastado:.1f}% de tus ingresos. "
                    "Mantén tu presupuesto balanceado con la regla 50/30/20."
                )
        else:
            sugerencia = "Registra tus ingresos para obtener recomendaciones basadas en la regla 50/30/20."

    except Exception as e:
        # Falla suave para no interrumpir el registro del gasto
        sugerencia = "Gasto guardado. Recuerda mantener un control balanceado de tus gastos."

    return {
        "sugerencia": sugerencia,
        "alerta": alerta
    }
