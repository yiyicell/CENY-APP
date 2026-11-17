from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from schemas.comunes import TipoFrecuencia, EstadoMeta


class AporteBase(BaseModel):
    valor: Decimal = Field(..., gt=0, decimal_places=2, description="Monto del aporte a la meta")
    fecha_aporte: date = Field(default_factory=date.today, description="Fecha en que se realiza el aporte")


class AporteCreate(AporteBase):
    origen: Optional[Literal["saldo", "externo"]] = Field(
        default="saldo",
        description="Origen del capital: 'saldo' (descuenta de ingresos del mes) o 'externo' (ahorro previo/dinero aparte)",
    )


class AporteResponse(AporteBase):
    id: UUID
    meta_id: UUID
    origen: Optional[str] = "saldo"
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class MementoCreate(BaseModel):
    nota: Optional[str] = Field(default="Punto de control manual", max_length=250)


class MementoResponse(BaseModel):
    id: str
    meta_id: str
    index: int
    monto_actual: Decimal
    estado: str
    fecha_registro: str
    nota: Optional[str] = None


class EstadoMetaMementoUpdate(BaseModel):
    estado: str = Field(..., description="EN_PROGRESO, COMPLETADA o CANCELADA")


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
    ahorro_desde_saldo: Decimal = Decimal("0.00")
    ahorro_externo: Decimal = Decimal("0.00")
    progreso_porcentaje: float = 0.0
    cuota_sugerida: Optional[Decimal] = None
    periodos_restantes: Optional[int] = None
    dias_restantes: Optional[int] = None
    dias_totales: Optional[int] = None
    ritmo_esperado_porcentaje: Optional[float] = None
    monto_ideal_a_hoy: Optional[Decimal] = None
    diferencia_ritmo: Optional[Decimal] = None
    estado_seguimiento: Optional[str] = None
    mensaje_seguimiento: Optional[str] = None
    estado_memento: Optional[str] = None
    cantidad_mementos: int = 0
    aportes: Optional[List[AporteResponse]] = None

    class Config:
        from_attributes = True


class RestaurarMementoResponse(BaseModel):
    mensaje: str
    meta: MetaResponse
    memento_restaurado: MementoResponse
    aportes_revertidos: int = 0
