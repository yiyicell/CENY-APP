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
        nombres_esperados = {
            "Alimentación": "alta",
            "Transporte": "alta",
            "Vivienda": "alta",
            "Salud": "alta",
            "Ocio": "baja",
        }
        existentes = (
            client.table("categorias")
            .select("nombre")
            .eq("usuario_id", user_id)
            .execute()
        )
        nombres_existentes = {c["nombre"] for c in (existentes.data or [])}

        faltantes = []
        for nombre, prioridad in nombres_esperados.items():
            if nombre not in nombres_existentes:
                faltantes.append({
                    "id": str(uuid.uuid4()),
                    "usuario_id": user_id,
                    "nombre": nombre,
                    "prioridad": prioridad,
                })
        if faltantes:
            client.table("categorias").insert(faltantes).execute()
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
