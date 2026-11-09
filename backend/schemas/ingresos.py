from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

class IngresoBase(BaseModel):
    valor: Decimal = Field(..., gt=0, decimal_places=2, description="Monto del ingreso (debe ser mayor a 0)")
    fecha_ingreso: date = Field(default_factory=date.today, description="Fecha en que se percibió el ingreso")
    descripcion: Optional[str] = Field(None, max_length=255, description="Descripción o fuente del ingreso")

class IngresoCreate(IngresoBase):
    pass

class IngresoResponse(IngresoBase):
    id: UUID
    usuario_id: UUID
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
