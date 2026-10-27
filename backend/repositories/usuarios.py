from supabase import Client
import jwt
from typing import Optional

def obtener_usuario_id(client: Client, jwt_token: str) -> str:
    """
    Obtiene el UUID del usuario a partir del token JWT de Supabase Auth.
    """
    try:
        decoded = jwt.decode(jwt_token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        if user_id:
            return str(user_id)
    except Exception:
        pass
    
    try:
        res = client.auth.get_user(jwt_token)
        if res and res.user:
            return str(res.user.id)
    except Exception as e:
        raise ValueError(f"No se pudo autenticar el usuario con el token proporcionado: {str(e)}")
    
    raise ValueError("Token JWT inválido o sin identificador de usuario")

def asegurar_usuario_perfil(client: Client, jwt_token: str, user_id: str):
    """
    Garantiza que el registro del usuario exista en la tabla pública 'usuarios'
    para evitar violaciones de clave foránea.
    """
    try:
        client.postgrest.auth(jwt_token)
        res = client.table("usuarios").select("id").eq("id", user_id).execute()
        if not res.data:
            nombre = "Usuario"
            try:
                user_auth = client.auth.get_user(jwt_token)
                if user_auth and user_auth.user:
                    meta = user_auth.user.user_metadata or {}
                    nombre = meta.get("nombre") or (user_auth.user.email.split("@")[0] if user_auth.user.email else "Usuario")
            except Exception:
                pass
            client.table("usuarios").insert({"id": user_id, "nombre": nombre}).execute()
    except Exception:
        # Si ya existe o falla silenciosamente, continuar
        pass

def obtener_perfil_usuario(client: Client, jwt_token: str) -> Optional[dict]:
    client.postgrest.auth(jwt_token)
    user_id = obtener_usuario_id(client, jwt_token)
    respuesta = client.table("usuarios").select("*").eq("id", user_id).execute()
    return respuesta.data[0] if respuesta.data else None
