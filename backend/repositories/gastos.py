from supabase import Client
from repositories.usuarios import obtener_usuario_id, asegurar_usuario_perfil
import uuid

def listar_gastos(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("gastos").select("*").execute()
    return respuesta.data

def crear_gasto(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    user_id = obtener_usuario_id(client, jwt)
    asegurar_usuario_perfil(client, jwt, user_id)
    datos["usuario_id"] = user_id
    
    if "id" not in datos or not datos["id"]:
        datos["id"] = str(uuid.uuid4())
        
    respuesta = client.table("gastos").insert(datos).execute()
    return respuesta.data[0] if respuesta.data else None

def obtener_gasto_por_id(client: Client, jwt: str, gasto_id: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("gastos").select("*").eq("id", gasto_id).execute()
    return respuesta.data[0] if respuesta.data else None

def eliminar_gasto(client: Client, jwt: str, gasto_id: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("gastos").delete().eq("id", gasto_id).execute()
    return respuesta.data
