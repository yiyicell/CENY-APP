from supabase import Client
from repositories.usuarios import obtener_usuario_id, asegurar_usuario_perfil
import uuid

def listar_categorias(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("categorias").select("*").execute()
    return respuesta.data

def crear_categoria(client: Client, jwt: str, datos: dict):
    client.postgrest.auth(jwt)
    user_id = obtener_usuario_id(client, jwt)
    asegurar_usuario_perfil(client, jwt, user_id)
    datos["usuario_id"] = user_id
    
    if "id" not in datos or not datos["id"]:
        datos["id"] = str(uuid.uuid4())
        
    respuesta = client.table("categorias").insert(datos).execute()
    return respuesta.data[0] if respuesta.data else None
