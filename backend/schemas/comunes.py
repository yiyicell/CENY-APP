from enum import Enum
from pydantic import BaseModel
from typing import Optional, Any

class PrioridadEnum(str, Enum):
    alta = "alta"
    media = "media"
    baja = "baja"

class TipoFrecuencia(str, Enum):
    mensual = "mensual"
    quincenal = "quincenal"

class EstadoMeta(str, Enum):
    por_cumplir = "por_cumplir"
    no_cumplido = "no_cumplido"
    cumplido = "cumplido"

class ErrorResponse(BaseModel):
    error: bool = True
    mensaje: str
    codigo: int
    detalles: Optional[Any] = None
