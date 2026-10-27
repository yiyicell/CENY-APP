from supabase import Client
import jwt
from typing import Optional

def obtener_usuario_id(client: Client, jwt_token: str) -> str:
    """
    Obtiene el UUID del usuario a partir del token JWT de Supabase Auth.
    Intenta primero decodificar el claim 'sub' del JWT y, si falla,
    consulta directamente con el servicio de autenticación de Supabase.
    """
    try:
        decoded = jwt.decode(jwt_token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        if user_id:
            return str(user_id)
    except Exception:
        pass
    
    # Fallback con el cliente de Supabase
    try:
        res = client.auth.get_user(jwt_token)
        if res and res.user:
            return str(res.user.id)
    except Exception as e:
        raise ValueError(f"No se pudo autenticar el usuario con el token proporcionado: {str(e)}")
    
    raise ValueError("Token JWT inválido o sin identificador de usuario")

def obtener_perfil_usuario(client: Client, jwt_token: str) -> Optional[dict]:
    client.postgrest.auth(jwt_token)
    user_id = obtener_usuario_id(client, jwt_token)
    respuesta = client.table("usuarios").select("*").eq("id", user_id).execute()
    return respuesta.data[0] if respuesta.data else None
