from repositories import metas as metas_repo
from datetime import date, datetime
from decimal import Decimal
import math
from typing import Optional, List, Dict, Any

def _parsear_fecha(valor) -> date:
    if isinstance(valor, date):
        return valor
    if isinstance(valor, str):
        return datetime.strptime(valor, "%Y-%m-%d").date()
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
    frecuencia = str(meta.get("frecuencia_ahorro", "mensual")).lower()
    
    dias_restantes = (fecha_obj - hoy).days
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
    meta_con_metricas["aportes"] = aportes_meta
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
    # Convertir date/Decimal a formatos serializables
    datos_insert = dict(datos)
    if "fecha_objetivo" in datos_insert and isinstance(datos_insert["fecha_objetivo"], date):
        datos_insert["fecha_objetivo"] = datos_insert["fecha_objetivo"].isoformat()
    if "valor_objetivo" in datos_insert:
        datos_insert["valor_objetivo"] = float(datos_insert["valor_objetivo"])
        
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
    if "valor" in datos_insert:
        datos_insert["valor"] = float(datos_insert["valor"])
        
    nuevo_aporte = metas_repo.crear_aporte(client, jwt, datos_insert)
    if not nuevo_aporte:
        raise ValueError("Error al registrar el aporte en base de datos")
        
    # Verificar si con el nuevo aporte se cumplió la meta
    aportes = metas_repo.listar_aportes(client, jwt, meta_id=meta_id) or []
    total_ahorrado = sum(float(a.get("valor", 0)) for a in aportes)
    valor_objetivo = float(meta.get("valor_objetivo", 0))
    if total_ahorrado >= valor_objetivo and meta.get("estado") != "cumplido":
        metas_repo.actualizar_meta(client, jwt, meta_id, {"estado": "cumplido"})
        
    return nuevo_aporte
