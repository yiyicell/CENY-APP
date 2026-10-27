from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from schemas.comunes import TipoFrecuencia, EstadoMeta

class AporteBase(BaseModel):
    valor: Decimal = Field(..., gt=0, decimal_places=2, description="Monto del aporte a la meta")
    fecha_aporte: date = Field(default_factory=date.today, description="Fecha en que se realiza el aporte")

class AporteCreate(AporteBase):
    pass

class AporteResponse(AporteBase):
    id: UUID
    meta_id: UUID
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class MetaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150, description="Nombre de la meta de ahorro")
    valor_objetivo: Decimal = Field(..., gt=0, decimal_places=2, description="Monto objetivo a ahorrar")
    frecuencia_ahorro: TipoFrecuencia = Field(..., description="Frecuencia planeada para ahorrar (mensual o quincenal)")
    fecha_objetivo: date = Field(..., description="Fecha límite para cumplir la meta")

class MetaCreate(MetaBase):
    pass

class MetaUpdate(BaseModel):
    nombre: Optional[str] = None
    valor_objetivo: Optional[Decimal] = Field(None, gt=0)
    frecuencia_ahorro: Optional[TipoFrecuencia] = None
    fecha_objetivo: Optional[date] = None
    estado: Optional[EstadoMeta] = None

class MetaResponse(MetaBase):
    id: UUID
    usuario_id: UUID
    estado: EstadoMeta
    creado_en: Optional[datetime] = None
    total_ahorrado: Decimal = Decimal("0.00")
    progreso_porcentaje: float = 0.0
    cuota_sugerida: Optional[Decimal] = None
    periodos_restantes: Optional[int] = None
    aportes: Optional[List[AporteResponse]] = None

    class Config:
        from_attributes = True
