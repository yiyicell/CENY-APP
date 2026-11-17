from supabase import Client
from repositories.usuarios import obtener_usuario_id, asegurar_usuario_perfil
from typing import Optional, List, Dict, Any
import uuid
import os
import json

_STORE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "mementos_store.json")
)


def _cargar_store_local() -> Dict[str, Any]:
    if not os.path.exists(_STORE_PATH):
        return {"mementos": {}, "reverted_aportes": {}, "aportes_origen": {}}
    try:
        with open(_STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return {"mementos": {}, "reverted_aportes": {}, "aportes_origen": {}}
            data.setdefault("mementos", {})
            data.setdefault("reverted_aportes", {})
            data.setdefault("aportes_origen", {})
            return data
    except Exception:
        return {"mementos": {}, "reverted_aportes": {}, "aportes_origen": {}}


def _guardar_store_local(store: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(_STORE_PATH), exist_ok=True)
    with open(_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def listar_metas(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("metas").select("*").execute()
    return respuesta.data


def crear_meta(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    user_id = obtener_usuario_id(client, jwt)
    asegurar_usuario_perfil(client, jwt, user_id)
    datos["usuario_id"] = user_id

    if "id" not in datos or not datos["id"]:
        datos["id"] = str(uuid.uuid4())

    respuesta = client.table("metas").insert(datos).execute()
    return respuesta.data[0] if respuesta.data else None


def obtener_meta_por_id(client: Client, jwt: str, meta_id: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("metas").select("*").eq("id", meta_id).execute()
    return respuesta.data[0] if respuesta.data else None


def actualizar_meta(client: Client, jwt: str, meta_id: str, datos: dict):
    client.postgrest.auth(jwt)
    respuesta = client.table("metas").update(datos).eq("id", meta_id).execute()
    return respuesta.data[0] if respuesta.data else None


def eliminar_meta(client: Client, jwt: str, meta_id: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("metas").delete().eq("id", meta_id).execute()
    return respuesta.data


def listar_aportes(client: Client, jwt: str, meta_id: Optional[str] = None):
    client.postgrest.auth(jwt)
    query = client.table("aportes").select("*")
    if meta_id:
        query = query.eq("meta_id", meta_id)
    respuesta = query.execute()
    return respuesta.data


def obtener_origenes_aportes_local() -> Dict[str, str]:
    store = _cargar_store_local()
    return dict(store.get("aportes_origen", {}))


def guardar_origen_aporte_local(aporte_id: str, origen: str) -> None:
    store = _cargar_store_local()
    origenes = store.setdefault("aportes_origen", {})
    origenes[str(aporte_id)] = origen if origen in ("saldo", "externo") else "saldo"
    _guardar_store_local(store)


def crear_aporte(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    datos_insert = dict(datos)
    origen = str(datos_insert.pop("origen", "saldo") or "saldo")
    if origen not in ("saldo", "externo"):
        origen = "saldo"

    if "id" not in datos_insert or not datos_insert["id"]:
        datos_insert["id"] = str(uuid.uuid4())

    respuesta = client.table("aportes").insert(datos_insert).execute()
    if not respuesta.data:
        return None
    aporte_creado = dict(respuesta.data[0])
    guardar_origen_aporte_local(str(aporte_creado.get("id")), origen)
    aporte_creado["origen"] = origen
    return aporte_creado


def eliminar_aporte(client: Client, jwt: str, aporte_id: str) -> bool:
    """
    Intenta eliminar físicamente un aporte en Supabase.
    Retorna True si la fila fue eliminada en BD, False si RLS o restricciones lo impidieron.
    """
    client.postgrest.auth(jwt)
    try:
        respuesta = client.table("aportes").delete().eq("id", aporte_id).execute()
        return bool(respuesta.data and len(respuesta.data) > 0)
    except Exception:
        return False


def obtener_aportes_revertidos_local(meta_id: Optional[str] = None) -> List[str]:
    store = _cargar_store_local()
    reverted = store.get("reverted_aportes", {})
    if meta_id:
        return list(reverted.get(str(meta_id), []))
    todos: List[str] = []
    for ids in reverted.values():
        todos.extend(ids)
    return todos


def marcar_aporte_revertido_local(meta_id: str, aporte_id: str) -> None:
    store = _cargar_store_local()
    reverted = store.setdefault("reverted_aportes", {})
    lista = reverted.setdefault(str(meta_id), [])
    if str(aporte_id) not in lista:
        lista.append(str(aporte_id))
    _guardar_store_local(store)


def desmarcar_aporte_revertido_local(meta_id: str, aporte_id: str) -> None:
    store = _cargar_store_local()
    reverted = store.get("reverted_aportes", {})
    lista = reverted.get(str(meta_id), [])
    if str(aporte_id) in lista:
        lista.remove(str(aporte_id))
        _guardar_store_local(store)


def listar_mementos(client: Client, jwt: str, meta_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Lista los mementos guardados para una meta (o todas).
    Intenta leer primero de PostgreSQL `meta_mementos`; si la tabla aún no existe,
    recurre transparentemente al almacén local del Caretaker.
    """
    client.postgrest.auth(jwt)
    try:
        query = client.table("meta_mementos").select("*").order("fecha_registro", desc=False)
        if meta_id:
            query = query.eq("meta_id", meta_id)
        respuesta = query.execute()
        if isinstance(respuesta.data, list):
            return respuesta.data
    except Exception:
        pass

    store = _cargar_store_local()
    mementos_map = store.get("mementos", {})
    if meta_id:
        return list(mementos_map.get(str(meta_id), []))
    todos: List[Dict[str, Any]] = []
    for lista in mementos_map.values():
        todos.extend(lista)
    return todos


def crear_memento(client: Client, jwt: str, meta_id: str, datos: Dict[str, Any]) -> Dict[str, Any]:
    """
    Persiste un MetaAhorroMemento en PostgreSQL `meta_mementos`, con fallback local.
    """
    payload = dict(datos)
    payload["meta_id"] = str(meta_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = str(uuid.uuid4())

    client.postgrest.auth(jwt)
    try:
        respuesta = client.table("meta_mementos").insert(payload).execute()
        if respuesta.data:
            return respuesta.data[0]
    except Exception:
        pass

    store = _cargar_store_local()
    mementos_map = store.setdefault("mementos", {})
    lista = mementos_map.setdefault(str(meta_id), [])
    lista.append(payload)
    _guardar_store_local(store)
    return payload


def eliminar_memento(client: Client, jwt: str, meta_id: str, memento_id: str) -> None:
    """
    Elimina un memento específico de la pila persistida (usado al hacer Caretaker.deshacer()).
    """
    client.postgrest.auth(jwt)
    try:
        client.table("meta_mementos").delete().eq("id", memento_id).execute()
    except Exception:
        pass

    store = _cargar_store_local()
    mementos_map = store.get("mementos", {})
    lista = mementos_map.get(str(meta_id), [])
    nueva_lista = [m for m in lista if str(m.get("id")) != str(memento_id)]
    if len(nueva_lista) != len(lista):
        mementos_map[str(meta_id)] = nueva_lista
        _guardar_store_local(store)


def reemplazar_mementos_meta(
    client: Client, jwt: str, meta_id: str, lista_mementos: List[Dict[str, Any]]
) -> None:
    """
    Sincroniza la pila de mementos de una meta tras una operación de restauración por índice.
    """
    client.postgrest.auth(jwt)
    try:
        client.table("meta_mementos").delete().eq("meta_id", meta_id).execute()
        if lista_mementos:
            filas = [dict(m, meta_id=str(meta_id)) for m in lista_mementos]
            client.table("meta_mementos").insert(filas).execute()
    except Exception:
        pass

    store = _cargar_store_local()
    mementos_map = store.setdefault("mementos", {})
    mementos_map[str(meta_id)] = [dict(m, meta_id=str(meta_id)) for m in lista_mementos]
    _guardar_store_local(store)
