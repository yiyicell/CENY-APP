from fastapi import APIRouter, Depends, Header, status
from services import gestion_ingreso
from database.database import get_client
from schemas.ingresos import IngresoCreate, IngresoResponse
from typing import List

router = APIRouter(tags=["Ingresos"])

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")

@router.get("/ingresos", response_model=List[IngresoResponse])
def listar_ingresos(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_ingreso.obtener_ingreso(client, jwt)

@router.post("/ingresos", response_model=IngresoResponse, status_code=status.HTTP_201_CREATED)
def crear_ingreso(ingreso: IngresoCreate, jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_ingreso.registrar_ingreso(client, jwt, ingreso.model_dump())
