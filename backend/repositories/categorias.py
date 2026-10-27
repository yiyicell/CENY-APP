from supabase import Client
from repositories.usuarios import obtener_usuario_id, asegurar_usuario_perfil
import uuid

def asegurar_categorias_por_defecto(client: Client, jwt: str, user_id: str):
    """
    Garantiza que el usuario cuente con las categorías estándar de la Regla 50/30/20:
    - Necesidades (Prioridad Alta): Alimentación, Transporte, Vivienda, Salud
    - Deseos (Prioridad Baja): Ocio
    """
    try:
        client.postgrest.auth(jwt)
        propias = client.table("categorias").select("id").eq("usuario_id", user_id).execute()
        if not propias.data:
            cats = [
                {"id": str(uuid.uuid4()), "usuario_id": user_id, "nombre": "Alimentación", "prioridad": "alta"},
                {"id": str(uuid.uuid4()), "usuario_id": user_id, "nombre": "Transporte", "prioridad": "alta"},
                {"id": str(uuid.uuid4()), "usuario_id": user_id, "nombre": "Vivienda", "prioridad": "alta"},
                {"id": str(uuid.uuid4()), "usuario_id": user_id, "nombre": "Salud", "prioridad": "alta"},
                {"id": str(uuid.uuid4()), "usuario_id": user_id, "nombre": "Ocio", "prioridad": "baja"},
            ]
            client.table("categorias").insert(cats).execute()
    except Exception:
        pass

def listar_categorias(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    try:
        user_id = obtener_usuario_id(client, jwt)
        asegurar_usuario_perfil(client, jwt, user_id)
        asegurar_categorias_por_defecto(client, jwt, user_id)
    except Exception:
        pass
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
