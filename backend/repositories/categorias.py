from supabase import Client
from repositories.usuarios import obtener_usuario_id

def listar_categorias(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("categorias").select("*").execute()
    return respuesta.data

def crear_categoria(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    if "usuario_id" not in datos or not datos["usuario_id"]:
        datos["usuario_id"] = obtener_usuario_id(client, jwt)
    respuesta = client.table("categorias").insert(datos).execute()
    return respuesta.data[0] if respuesta.data else None
