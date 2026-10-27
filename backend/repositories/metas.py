from supabase import Client
from repositories.usuarios import obtener_usuario_id, asegurar_usuario_perfil
from typing import Optional
import uuid

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

def crear_aporte(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    if "id" not in datos or not datos["id"]:
        datos["id"] = str(uuid.uuid4())
        
    respuesta = client.table("aportes").insert(datos).execute()
    return respuesta.data[0] if respuesta.data else None
