from fastapi import APIRouter, HTTPException
from repositories.database import supabase

router = APIRouter(
    prefix="/categorias",
    tags=["Categorias"]
)

@router.get('/')
def obtener_categorias():
    try:
        respuesta = supabase.table("categorias").select("*").execute()
        return respuesta.data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )