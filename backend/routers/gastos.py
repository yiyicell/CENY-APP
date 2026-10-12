from fastapi import APIRouter, Depends, Header
from services import gestion_gastos
from database.database import get_client

router = APIRouter()

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")

@router.get("/gastos")
def listar_gastos(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_gastos.obtener_gastos(client, jwt)