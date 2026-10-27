from fastapi import APIRouter, Depends, Header, status
from services import gestion_gastos
from database.database import get_client
from schemas.gastos import GastoCreate, GastoResponse, GastoConSugerenciaResponse
from typing import List

router = APIRouter(tags=["Gastos"])

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")

@router.get("/gastos", response_model=List[GastoResponse])
def listar_gastos(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_gastos.obtener_gastos(client, jwt)

@router.post("/gastos", response_model=GastoConSugerenciaResponse, status_code=status.HTTP_201_CREATED)
def crear_gasto(gasto: GastoCreate, jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_gastos.registrar_gasto(client, jwt, gasto.model_dump())
