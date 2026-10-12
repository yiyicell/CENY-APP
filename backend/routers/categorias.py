from fastapi import APIRouter, Depends, Header
from services import gestion_categorias
from database.database import get_client

router = APIRouter()

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")

@router.get("/categorias")
def listar_categorias(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_categorias.obtener_categorias(client, jwt)
