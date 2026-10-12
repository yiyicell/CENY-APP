from fastapi import APIRouter, Depends, Header
from services import gestion_ingreso
from database.database import get_client

router = APIRouter()

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")
@router.get("/ingresos")
def listar_ingresos(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_ingreso.obtener_ingreso(client, jwt)