from fastapi import APIRouter, HTTPException, status
from database.database import get_client
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=TokenResponse)
def login(credenciales: LoginRequest):
    client = get_client()
    try:
        respuesta = client.auth.sign_in_with_password({
            "email": str(credenciales.email),
            "password": credenciales.password
        })
        if not respuesta.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        return TokenResponse(
            access_token=respuesta.session.access_token,
            user_id=str(respuesta.user.id),
            email=respuesta.user.email
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticación: {str(e)}"
        )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(datos: RegisterRequest):
    client = get_client()
    try:
        respuesta = client.auth.sign_up({
            "email": str(datos.email),
            "password": datos.password,
            "options": {
                "data": {"nombre": datos.nombre}
            }
        })
        if not respuesta.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo registrar el usuario en Supabase"
            )
        
        # Registrar en la tabla pública de usuarios
        try:
            client.table("usuarios").upsert({
                "id": str(respuesta.user.id),
                "nombre": datos.nombre
            }).execute()
        except Exception:
            pass

        token = respuesta.session.access_token if respuesta.session else "requiere_confirmacion_o_login"
        return TokenResponse(
            access_token=token,
            user_id=str(respuesta.user.id),
            email=respuesta.user.email
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en registro: {str(e)}"
        )
