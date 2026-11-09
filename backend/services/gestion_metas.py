from repositories import metas as metas_repo
from datetime import date, datetime
from decimal import Decimal
import math
from typing import Optional, List, Dict, Any

def _parsear_fecha(valor) -> date:
    if isinstance(valor, date):
        return valor
    if isinstance(valor, str):
        try:
            return datetime.strptime(valor.split("T")[0], "%Y-%m-%d").date()
        except Exception:
            pass
    return date.today()

def calcular_metricas_meta(meta: dict, aportes: List[dict]) -> dict:
    meta_id = str(meta.get("id"))
    aportes_meta = [a for a in aportes if str(a.get("meta_id")) == meta_id]
    total_ahorrado = sum(float(a.get("valor", 0)) for a in aportes_meta)
    valor_objetivo = float(meta.get("valor_objetivo", 0))
    
    progreso = 0.0
    if valor_objetivo > 0:
        progreso = min(100.0, round((total_ahorrado / valor_objetivo) * 100, 2))
    
    hoy = date.today()
    fecha_obj = _parsear_fecha(meta.get("fecha_objetivo"))
    fecha_creado = _parsear_fecha(meta.get("creado_en", hoy.isoformat()))
    frecuencia = str(meta.get("frecuencia_ahorro", "mensual")).lower()
    
    dias_totales = max(1, (fecha_obj - fecha_creado).days)
    dias_restantes = (fecha_obj - hoy).days
    dias_transcurridos = max(0, (hoy - fecha_creado).days)
    
    # Ritmo temporal esperado (%)
    ritmo_esperado = min(100.0, max(0.0, round((dias_transcurridos / dias_totales) * 100, 1)))
    monto_ideal_a_hoy = round(valor_objetivo * (ritmo_esperado / 100.0), 2)
    diferencia_ritmo = round(total_ahorrado - monto_ideal_a_hoy, 2)
    
    if total_ahorrado >= valor_objetivo or meta.get("estado") == "cumplido":
        estado_seguimiento = "cumplida"
        mensaje_seguimiento = "Meta cumplida en su totalidad."
    elif dias_restantes <= 0:
        estado_seguimiento = "vencida"
        mensaje_seguimiento = "La fecha objetivo ha vencido. Puedes seguir realizando aportes para completarla."
    elif dias_restantes <= 7 and progreso < 95.0:
        estado_seguimiento = "por_vencer"
        mensaje_seguimiento = f"Plazo crítico: Restan solo {dias_restantes} día(s) para la fecha límite ({fecha_obj.strftime('%d/%m/%Y')}) y aún falta el {100 - progreso:.1f}% del capital. Se requiere aportar inmediatamente."
    elif dias_restantes <= 14 and progreso == 0.0 and dias_totales <= 14:
        estado_seguimiento = "por_vencer"
        mensaje_seguimiento = f"Plazo corto: Restan {dias_restantes} días para reunir el capital total sin aportes registrados. Se aconseja iniciar aportes prioritarios."
    elif progreso < ritmo_esperado:
        estado_seguimiento = "atrasado"
        diferencia_abs = abs(diferencia_ritmo)
        mensaje_seguimiento = f"Retraso acumulado: Faltan ${diferencia_abs:,.0f} COP para igualar el cronograma esperado a hoy."
    elif dias_transcurridos == 0 and total_ahorrado == 0:
        estado_seguimiento = "al_dia"
        mensaje_seguimiento = f"Meta iniciada hoy. Restan {dias_restantes} días; realiza tu primer aporte para comenzar el avance."
    else:
        estado_seguimiento = "al_dia"
        mensaje_seguimiento = "Ritmo óptimo: El avance acumulado cumple con el cronograma previsto hacia la fecha límite."

    if dias_restantes <= 0:
        periodos_restantes = 1
    else:
        divisor = 15 if frecuencia == "quincenal" else 30
        periodos_restantes = max(1, math.ceil(dias_restantes / divisor))
        
    monto_pendiente = max(0.0, valor_objetivo - total_ahorrado)
    cuota_sugerida = round(monto_pendiente / periodos_restantes, 2) if periodos_restantes > 0 else 0.0
    
    meta_con_metricas = dict(meta)
    meta_con_metricas["total_ahorrado"] = total_ahorrado
    meta_con_metricas["progreso_porcentaje"] = progreso
    meta_con_metricas["cuota_sugerida"] = cuota_sugerida
    meta_con_metricas["periodos_restantes"] = periodos_restantes
    meta_con_metricas["dias_restantes"] = max(0, dias_restantes)
    meta_con_metricas["dias_totales"] = dias_totales
    meta_con_metricas["ritmo_esperado_porcentaje"] = ritmo_esperado
    meta_con_metricas["monto_ideal_a_hoy"] = monto_ideal_a_hoy
    meta_con_metricas["diferencia_ritmo"] = diferencia_ritmo
    meta_con_metricas["estado_seguimiento"] = estado_seguimiento
    meta_con_metricas["mensaje_seguimiento"] = mensaje_seguimiento
    meta_con_metricas["aportes"] = sorted(
        aportes_meta,
        key=lambda x: str(x.get("fecha_aporte", "")),
        reverse=True
    )
    return meta_con_metricas

def obtener_metas(client, jwt: str) -> List[dict]:
    metas = metas_repo.listar_metas(client, jwt) or []
    aportes = metas_repo.listar_aportes(client, jwt) or []
    return [calcular_metricas_meta(m, aportes) for m in metas]

def obtener_meta_detalle(client, jwt: str, meta_id: str) -> Optional[dict]:
    meta = metas_repo.obtener_meta_por_id(client, jwt, meta_id)
    if not meta:
        return None
    aportes = metas_repo.listar_aportes(client, jwt, meta_id=meta_id) or []
    return calcular_metricas_meta(meta, aportes)

def registrar_meta(client, jwt: str, datos: dict) -> dict:
    datos_insert = dict(datos)
    if "fecha_objetivo" in datos_insert and isinstance(datos_insert["fecha_objetivo"], date):
        datos_insert["fecha_objetivo"] = datos_insert["fecha_objetivo"].isoformat()
    elif "fecha_objetivo" in datos_insert:
        datos_insert["fecha_objetivo"] = str(datos_insert["fecha_objetivo"])
    if "valor_objetivo" in datos_insert:
        datos_insert["valor_objetivo"] = float(datos_insert["valor_objetivo"])
    if "frecuencia_ahorro" in datos_insert:
        frec = datos_insert["frecuencia_ahorro"]
        datos_insert["frecuencia_ahorro"] = frec.value if hasattr(frec, "value") else str(frec)
    if "estado" in datos_insert and datos_insert["estado"] is not None:
        est = datos_insert["estado"]
        datos_insert["estado"] = est.value if hasattr(est, "value") else str(est)
        
    nueva_meta = metas_repo.crear_meta(client, jwt, datos_insert)
    if not nueva_meta:
        raise ValueError("Error al crear la meta en base de datos")
    return calcular_metricas_meta(nueva_meta, [])

def registrar_aporte(client, jwt: str, meta_id: str, datos: dict) -> dict:
    meta = metas_repo.obtener_meta_por_id(client, jwt, meta_id)
    if not meta:
        raise ValueError(f"No existe una meta con id: {meta_id}")
        
    datos_insert = dict(datos)
    datos_insert["meta_id"] = meta_id
    if "fecha_aporte" in datos_insert and isinstance(datos_insert["fecha_aporte"], date):
        datos_insert["fecha_aporte"] = datos_insert["fecha_aporte"].isoformat()
    elif "fecha_aporte" in datos_insert:
        datos_insert["fecha_aporte"] = str(datos_insert["fecha_aporte"])
    if "valor" in datos_insert:
        datos_insert["valor"] = float(datos_insert["valor"])
        
    nuevo_aporte = metas_repo.crear_aporte(client, jwt, datos_insert)
    if not nuevo_aporte:
        raise ValueError("Error al registrar el aporte en base de datos")
        
    aportes = metas_repo.listar_aportes(client, jwt, meta_id=meta_id) or []
    total_ahorrado = sum(float(a.get("valor", 0)) for a in aportes)
    valor_objetivo = float(meta.get("valor_objetivo", 0))
    if total_ahorrado >= valor_objetivo and meta.get("estado") != "cumplido":
        metas_repo.actualizar_meta(client, jwt, meta_id, {"estado": "cumplido"})
        
    return nuevo_aporte
