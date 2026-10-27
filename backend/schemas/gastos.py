from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from schemas.comunes import TipoFrecuencia

class GastoBase(BaseModel):
    categoria_id: UUID = Field(..., description="ID de la categoría a la que pertenece el gasto")
    valor: Decimal = Field(..., gt=0, decimal_places=2, description="Monto del gasto (debe ser mayor a 0)")
    fecha_gasto: date = Field(default_factory=date.today, description="Fecha en que se efectuó el gasto")
    descripcion: Optional[str] = Field(None, max_length=255, description="Descripción del gasto")
    frecuencia: Optional[TipoFrecuencia] = Field(None, description="Frecuencia si es gasto fijo/recurrente (mensual, quincenal)")

class GastoCreate(GastoBase):
    pass

class GastoResponse(GastoBase):
    id: UUID
    usuario_id: UUID
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class GastoConSugerenciaResponse(BaseModel):
    mensaje: str = "Gasto registrado correctamente"
    gasto: GastoResponse
    sugerencia: Optional[str] = None
    alerta: Optional[str] = None
