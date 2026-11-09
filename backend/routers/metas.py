from fastapi import APIRouter, Depends, Header, status, HTTPException
from services import gestion_metas
from database.database import get_client
from schemas.metas import MetaCreate, MetaResponse, AporteCreate, AporteResponse
from typing import List
from uuid import UUID

router = APIRouter(tags=["Metas de Ahorro"])

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")

@router.get("/metas", response_model=List[MetaResponse])
def listar_metas(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_metas.obtener_metas(client, jwt)

@router.post("/metas", response_model=MetaResponse, status_code=status.HTTP_201_CREATED)
def crear_meta(meta: MetaCreate, jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_metas.registrar_meta(client, jwt, meta.model_dump())

@router.get("/metas/{meta_id}", response_model=MetaResponse)
def obtener_meta(meta_id: UUID, jwt: str = Depends(obtener_jwt)):
    client = get_client()
    meta = gestion_metas.obtener_meta_detalle(client, jwt, str(meta_id))
    if not meta:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return meta

@router.post("/metas/{meta_id}/aportes", response_model=AporteResponse, status_code=status.HTTP_201_CREATED)
def agregar_aporte(meta_id: UUID, aporte: AporteCreate, jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_metas.registrar_aporte(client, jwt, str(meta_id), aporte.model_dump())
