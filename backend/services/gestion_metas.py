from repositories import metas as metas_repo
from patterns.memento import (
    EstadoMeta,
    MetaAhorroMemento,
    MetaAhorro,
    HistorialMetaCaretaker,
)
from datetime import date, datetime
from decimal import Decimal
import math
from typing import Optional, List, Dict, Any, Tuple


def _parsear_fecha(valor) -> date:
    if isinstance(valor, date) and not isinstance(valor, datetime):
        return valor
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, str):
        try:
            return datetime.strptime(valor.split("T")[0], "%Y-%m-%d").date()
        except Exception:
            pass
    return date.today()


def _filtrar_aportes_activos(meta_id: str, aportes: List[dict]) -> List[dict]:
    revertidos = set(metas_repo.obtener_aportes_revertidos_local(meta_id))
    activos = [
        a
        for a in aportes
        if str(a.get("meta_id")) == str(meta_id) and str(a.get("id")) not in revertidos
    ]
    return sorted(
        activos,
        key=lambda x: (str(x.get("fecha_aporte", "")), str(x.get("creado_en", ""))),
    )


def calcular_metricas_meta(
    meta: dict,
    aportes: List[dict],
    mementos: Optional[List[dict]] = None,
) -> dict:
    meta_id = str(meta.get("id"))
    aportes_meta_raw = _filtrar_aportes_activos(meta_id, aportes)
    origenes_local = metas_repo.obtener_origenes_aportes_local()

    aportes_meta: List[dict] = []
    ahorro_desde_saldo = 0.0
    ahorro_externo = 0.0
    for a in aportes_meta_raw:
        ap_copy = dict(a)
        origen = str(ap_copy.get("origen") or origenes_local.get(str(ap_copy.get("id")), "saldo"))
        if origen not in ("saldo", "externo"):
            origen = "saldo"
        ap_copy["origen"] = origen
        val = float(ap_copy.get("valor", 0))
        if origen == "externo":
            ahorro_externo = round(ahorro_externo + val, 2)
        else:
            ahorro_desde_saldo = round(ahorro_desde_saldo + val, 2)
        aportes_meta.append(ap_copy)

    total_ahorrado = round(ahorro_desde_saldo + ahorro_externo, 2)
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

    estado_db = str(meta.get("estado", "por_cumplir"))
    estado_memento = EstadoMeta.desde_db(estado_db)

    if estado_memento == EstadoMeta.CANCELADA:
        estado_seguimiento = "cancelada"
        mensaje_seguimiento = "Meta marcada como cancelada. Puedes reanudarla o restaurar un estado previo con Memento."
    elif total_ahorrado >= valor_objetivo or estado_db == "cumplido":
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

    cantidad_mementos = 0
    if mementos is not None:
        cantidad_mementos = len([m for m in mementos if str(m.get("meta_id")) == meta_id])
        if cantidad_mementos == 0 and len(aportes_meta) > 0:
            cantidad_mementos = len(aportes_meta)

    meta_con_metricas = dict(meta)
    meta_con_metricas["total_ahorrado"] = total_ahorrado
    meta_con_metricas["ahorro_desde_saldo"] = ahorro_desde_saldo
    meta_con_metricas["ahorro_externo"] = ahorro_externo
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
    meta_con_metricas["estado_memento"] = estado_memento.value
    meta_con_metricas["cantidad_mementos"] = cantidad_mementos
    meta_con_metricas["aportes"] = sorted(
        aportes_meta,
        key=lambda x: str(x.get("fecha_aporte", "")),
        reverse=True,
    )
    return meta_con_metricas


def _construir_originator_y_caretaker(
    client, jwt: str, meta_id: str
) -> Tuple[dict, MetaAhorro, HistorialMetaCaretaker, List[dict]]:
    """
    Construye el Originator (MetaAhorro) y su Caretaker (HistorialMetaCaretaker)
    a partir del estado persistido en Supabase / almacén Memento.
    Si una meta antigua ya tenía aportes sin mementos explícitos, reconstruye los
    snapshots históricos previos para que Deshacer funcione desde el primer momento.
    """
    meta = metas_repo.obtener_meta_por_id(client, jwt, meta_id)
    if not meta:
        raise ValueError(f"No existe una meta con id: {meta_id}")

    todos_aportes = metas_repo.listar_aportes(client, jwt, meta_id=meta_id) or []
    aportes_activos = _filtrar_aportes_activos(meta_id, todos_aportes)
    total_actual = round(sum(float(a.get("valor", 0)) for a in aportes_activos), 2)

    mementos_raw = metas_repo.listar_mementos(client, jwt, meta_id=meta_id) or []
    mementos_objs: List[MetaAhorroMemento] = [
        MetaAhorroMemento.from_dict(m) for m in mementos_raw
    ]

    # Reconstrucción automática para metas creadas antes del Patrón Memento
    if not mementos_objs and aportes_activos:
        acum = 0.0
        ids_acum: List[str] = []
        objetivo = float(meta.get("valor_objetivo", 0))
        for ap in aportes_activos:
            estado_prev = (
                EstadoMeta.COMPLETADA
                if objetivo > 0 and acum >= objetivo
                else EstadoMeta.EN_PROGRESO
            )
            fecha_ap_str = str(ap.get("fecha_aporte", date.today().isoformat()))
            try:
                fecha_dt = datetime.fromisoformat(fecha_ap_str.split("T")[0] + "T09:00:00")
            except Exception:
                fecha_dt = datetime.now()

            memento_rec = MetaAhorroMemento(
                montoActual=acum,
                estado=estado_prev,
                fechaRegistro=fecha_dt,
                nota=f"Previo a abono de ${float(ap.get('valor', 0)):,.0f}",
                aportes_ids=list(ids_acum),
            )
            guardado = metas_repo.crear_memento(client, jwt, meta_id, memento_rec.to_dict(meta_id))
            mementos_objs.append(MetaAhorroMemento.from_dict(guardado))

            acum = round(acum + float(ap.get("valor", 0)), 2)
            ids_acum.append(str(ap.get("id")))

    caretaker = HistorialMetaCaretaker(mementos_objs)
    originator = MetaAhorro(
        idMeta=str(meta.get("id")),
        nombreMeta=str(meta.get("nombre", "")),
        montoObjetivo=float(meta.get("valor_objetivo", 0)),
        montoActual=total_actual,
        fechaLimite=_parsear_fecha(meta.get("fecha_objetivo")),
        estado=EstadoMeta.desde_db(meta.get("estado")),
        caretaker=caretaker,
    )
    return meta, originator, caretaker, aportes_activos


def obtener_metas(client, jwt: str) -> List[dict]:
    metas = metas_repo.listar_metas(client, jwt) or []
    aportes = metas_repo.listar_aportes(client, jwt) or []
    mementos = metas_repo.listar_mementos(client, jwt) or []
    return [calcular_metricas_meta(m, aportes, mementos) for m in metas]


def obtener_meta_detalle(client, jwt: str, meta_id: str) -> Optional[dict]:
    meta = metas_repo.obtener_meta_por_id(client, jwt, meta_id)
    if not meta:
        return None
    aportes = metas_repo.listar_aportes(client, jwt, meta_id=meta_id) or []
    mementos = metas_repo.listar_mementos(client, jwt, meta_id=meta_id) or []
    return calcular_metricas_meta(meta, aportes, mementos)


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
    return calcular_metricas_meta(nueva_meta, [], [])


def registrar_aporte(client, jwt: str, meta_id: str, datos: dict) -> dict:
    meta, originator, caretaker, aportes_activos = _construir_originator_y_caretaker(
        client, jwt, meta_id
    )

    monto = float(datos.get("valor", 0))
    origen = str(datos.get("origen") or "saldo")
    if origen not in ("saldo", "externo"):
        origen = "saldo"
    nota_origen = "ahorro externo" if origen == "externo" else "saldo disponible"

    # 1. Patrón Memento: guardar estado previo ANTES de aplicar abonarMeta()
    memento_previo = originator.guardarEstado(
        nota=f"Previo a abono de ${monto:,.0f} ({nota_origen})",
        aportes_ids=[str(a.get("id")) for a in aportes_activos],
    )
    # 2. Aplicar lógica de negocio en Originator (valida > 0 y estado != CANCELADA)
    originator.abonarMeta(monto)

    # 3. Persistir Memento en Caretaker
    caretaker.agregarMemento(memento_previo)
    metas_repo.crear_memento(client, jwt, meta_id, memento_previo.to_dict(meta_id))

    # 4. Persistir el nuevo aporte en base de datos
    datos_insert = dict(datos)
    datos_insert["meta_id"] = meta_id
    datos_insert["origen"] = origen
    if "fecha_aporte" in datos_insert and isinstance(datos_insert["fecha_aporte"], date):
        datos_insert["fecha_aporte"] = datos_insert["fecha_aporte"].isoformat()
    elif "fecha_aporte" in datos_insert:
        datos_insert["fecha_aporte"] = str(datos_insert["fecha_aporte"])
    if "valor" in datos_insert:
        datos_insert["valor"] = float(datos_insert["valor"])

    nuevo_aporte = metas_repo.crear_aporte(client, jwt, datos_insert)
    if not nuevo_aporte:
        raise ValueError("Error al registrar el aporte en base de datos")

    # 5. Sincronizar estado de la meta si alcanzó el objetivo
    estado_nuevo_db = originator.getEstado().a_db()
    if estado_nuevo_db != meta.get("estado"):
        metas_repo.actualizar_meta(client, jwt, meta_id, {"estado": estado_nuevo_db})

    return nuevo_aporte


def obtener_historial_mementos(client, jwt: str, meta_id: str) -> List[Dict[str, Any]]:
    _, _, caretaker, _ = _construir_originator_y_caretaker(client, jwt, meta_id)
    historial = caretaker.listarHistorial()
    resultado: List[Dict[str, Any]] = []
    for idx, m in enumerate(historial):
        resultado.append(
            {
                "id": m.getId(),
                "meta_id": str(meta_id),
                "index": idx,
                "monto_actual": m.getMontoActual(),
                "estado": m.getEstado().value,
                "fecha_registro": m.getFechaRegistro().isoformat(),
                "nota": m.getNota(),
            }
        )
    return resultado


def guardar_snapshot_meta(
    client, jwt: str, meta_id: str, nota: Optional[str] = None
) -> Dict[str, Any]:
    _, originator, caretaker, aportes_activos = _construir_originator_y_caretaker(
        client, jwt, meta_id
    )
    memento = originator.guardarEstado(
        nota=nota or "Punto de control manual",
        aportes_ids=[str(a.get("id")) for a in aportes_activos],
    )
    caretaker.agregarMemento(memento)
    guardado = metas_repo.crear_memento(client, jwt, meta_id, memento.to_dict(meta_id))
    return {
        "id": str(guardado.get("id", memento.getId())),
        "meta_id": str(meta_id),
        "index": caretaker.totalMementos() - 1,
        "monto_actual": memento.getMontoActual(),
        "estado": memento.getEstado().value,
        "fecha_registro": memento.getFechaRegistro().isoformat(),
        "nota": memento.getNota(),
    }


def _aplicar_restauracion_en_bd(
    client,
    jwt: str,
    meta_id: str,
    originator: MetaAhorro,
    memento: MetaAhorroMemento,
    aportes_activos: List[dict],
) -> int:
    """
    Invoca MetaAhorro.restaurarEstado(memento) y sincroniza la base de datos
    (aportes y estado de la meta) para que reflejen exactamente el snapshot restaurado.
    """
    originator.restaurarEstado(memento)
    monto_objetivo_memento = memento.getMontoActual()
    ids_conservados = memento.getAportesIds()

    aportes_a_revertir: List[dict] = []
    if ids_conservados is not None:
        ids_set = set(str(i) for i in ids_conservados)
        aportes_a_revertir = [
            a for a in aportes_activos if str(a.get("id")) not in ids_set
        ]
    else:
        # Si no hay IDs explícitos, conservar cronológicamente hasta alcanzar el monto del snapshot
        acum = 0.0
        for a in aportes_activos:
            val = float(a.get("valor", 0))
            if round(acum + val, 2) <= round(monto_objetivo_memento, 2):
                acum = round(acum + val, 2)
            else:
                aportes_a_revertir.append(a)

    for ap in aportes_a_revertir:
        ap_id = str(ap.get("id"))
        eliminado_bd = metas_repo.eliminar_aporte(client, jwt, ap_id)
        if not eliminado_bd:
            metas_repo.marcar_aporte_revertido_local(meta_id, ap_id)

    estado_db = originator.getEstado().a_db()
    metas_repo.actualizar_meta(client, jwt, meta_id, {"estado": estado_db})
    return len(aportes_a_revertir)


def deshacer_ultimo_estado(client, jwt: str, meta_id: str) -> Dict[str, Any]:
    """
    Ejecuta HistorialMetaCaretaker.deshacer() y MetaAhorro.restaurarEstado(memento).
    """
    _, originator, caretaker, aportes_activos = _construir_originator_y_caretaker(
        client, jwt, meta_id
    )
    memento_anterior = caretaker.deshacer()
    indice_restaurado = caretaker.totalMementos()

    revertidos = _aplicar_restauracion_en_bd(
        client, jwt, meta_id, originator, memento_anterior, aportes_activos
    )
    metas_repo.eliminar_memento(client, jwt, meta_id, memento_anterior.getId())

    meta_actualizada = obtener_meta_detalle(client, jwt, meta_id)
    return {
        "mensaje": f"Estado restaurado a ${memento_anterior.getMontoActual():,.0f} COP ({memento_anterior.getEstado().value}).",
        "meta": meta_actualizada,
        "memento_restaurado": {
            "id": memento_anterior.getId(),
            "meta_id": str(meta_id),
            "index": indice_restaurado,
            "monto_actual": memento_anterior.getMontoActual(),
            "estado": memento_anterior.getEstado().value,
            "fecha_registro": memento_anterior.getFechaRegistro().isoformat(),
            "nota": memento_anterior.getNota(),
        },
        "aportes_revertidos": revertidos,
    }


def restaurar_estado_por_indice(client, jwt: str, meta_id: str, index: int) -> Dict[str, Any]:
    """
    Ejecuta HistorialMetaCaretaker.obtenerMemento(index) y MetaAhorro.restaurarEstado(memento).
    """
    _, originator, caretaker, aportes_activos = _construir_originator_y_caretaker(
        client, jwt, meta_id
    )
    try:
        memento_objetivo = caretaker.obtenerMemento(index)
    except IndexError as exc:
        raise ValueError(str(exc))

    revertidos = _aplicar_restauracion_en_bd(
        client, jwt, meta_id, originator, memento_objetivo, aportes_activos
    )

    # Conservar únicamente los mementos anteriores al punto restaurado
    mementos_restantes = [
        m.to_dict(meta_id) for m in caretaker.listarHistorial()[:index]
    ]
    metas_repo.reemplazar_mementos_meta(client, jwt, meta_id, mementos_restantes)

    meta_actualizada = obtener_meta_detalle(client, jwt, meta_id)
    return {
        "mensaje": f"Meta restaurada al punto #{index + 1} (${memento_objetivo.getMontoActual():,.0f} COP - {memento_objetivo.getEstado().value}).",
        "meta": meta_actualizada,
        "memento_restaurado": {
            "id": memento_objetivo.getId(),
            "meta_id": str(meta_id),
            "index": index,
            "monto_actual": memento_objetivo.getMontoActual(),
            "estado": memento_objetivo.getEstado().value,
            "fecha_registro": memento_objetivo.getFechaRegistro().isoformat(),
            "nota": memento_objetivo.getNota(),
        },
        "aportes_revertidos": revertidos,
    }


def cambiar_estado_meta(client, jwt: str, meta_id: str, nuevo_estado_str: str) -> Dict[str, Any]:
    """
    Cambia el estado de la meta (EN_PROGRESO / COMPLETADA / CANCELADA) guardando primero
    un Memento para que el cambio pueda deshacerse si el usuario lo desea.
    """
    nuevo_estado = EstadoMeta.desde_db(nuevo_estado_str)
    _, originator, caretaker, aportes_activos = _construir_originator_y_caretaker(
        client, jwt, meta_id
    )

    memento_previo = originator.guardarEstado(
        nota=f"Previo a cambio de estado a {nuevo_estado.value}",
        aportes_ids=[str(a.get("id")) for a in aportes_activos],
    )
    caretaker.agregarMemento(memento_previo)
    metas_repo.crear_memento(client, jwt, meta_id, memento_previo.to_dict(meta_id))

    if nuevo_estado == EstadoMeta.CANCELADA:
        originator.cancelarMeta()
    else:
        originator.reanudarMeta()

    metas_repo.actualizar_meta(
        client, jwt, meta_id, {"estado": originator.getEstado().a_db()}
    )
    detalle = obtener_meta_detalle(client, jwt, meta_id)
    if not detalle:
        raise ValueError("Error al recuperar la meta actualizada")
    return detalle


def actualizar_origen_aporte(
    client, jwt: str, meta_id: str, aporte_id: str, origen: str
) -> Dict[str, Any]:
    if origen not in ("saldo", "externo"):
        raise ValueError("Origen inválido. Debe ser 'saldo' o 'externo'.")
    meta = metas_repo.obtener_meta_por_id(client, jwt, meta_id)
    if not meta:
        raise ValueError(f"No existe una meta con id: {meta_id}")
    metas_repo.guardar_origen_aporte_local(aporte_id, origen)
    detalle = obtener_meta_detalle(client, jwt, meta_id)
    if not detalle:
        raise ValueError("Error al recuperar la meta actualizada")
    return detalle
