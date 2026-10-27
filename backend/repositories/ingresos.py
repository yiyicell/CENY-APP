from supabase import Client
from repositories.usuarios import obtener_usuario_id

def listar_ingreso(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("ingresos").select("*").execute()
    return respuesta.data

def crear_ingreso(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    if "usuario_id" not in datos or not datos["usuario_id"]:
        datos["usuario_id"] = obtener_usuario_id(client, jwt)
    respuesta = client.table("ingresos").insert(datos).execute()
    return respuesta.data[0] if respuesta.data else None

def obtener_ingreso_por_id(client: Client, jwt: str, ingreso_id: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("ingresos").select("*").eq("id", ingreso_id).execute()
    return respuesta.data[0] if respuesta.data else None

def eliminar_ingreso(client: Client, jwt: str, ingreso_id: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("ingresos").delete().eq("id", ingreso_id).execute()
    return respuesta.data
