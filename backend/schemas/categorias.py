from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from schemas.comunes import PrioridadEnum

class CategoriaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre de la categoría")
    prioridad: PrioridadEnum = Field(..., description="Prioridad: alta, media o baja")

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaResponse(CategoriaBase):
    id: UUID
    usuario_id: Optional[UUID] = None
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
