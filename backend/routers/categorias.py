from fastapi import APIRouter, Depends, Header, status
from services import gestion_categorias
from database.database import get_client
from schemas.categorias import CategoriaCreate, CategoriaResponse
from typing import List

router = APIRouter(tags=["Categorías"])

def obtener_jwt(authorizacion: str = Header(...)) -> str:
    return authorizacion.replace("Bearer ", "")

@router.get("/categorias", response_model=List[CategoriaResponse])
def listar_categorias(jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_categorias.obtener_categorias(client, jwt)

@router.post("/categorias", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
def crear_categoria(categoria: CategoriaCreate, jwt: str = Depends(obtener_jwt)):
    client = get_client()
    return gestion_categorias.registrar_categoria(client, jwt, categoria.model_dump())
