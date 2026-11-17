import sys
if sys.version_info >= (3, 11):
    from enum import StrEnum
else:
    from enum import Enum
    class StrEnum(str, Enum):
        def __str__(self):
            return self.value

from pydantic import BaseModel
from typing import Optional, Any

class PrioridadEnum(StrEnum):
    alta = "alta"
    media = "media"
    baja = "baja"

class TipoFrecuencia(StrEnum):
    mensual = "mensual"
    quincenal = "quincenal"

class EstadoMeta(StrEnum):
    por_cumplir = "por_cumplir"
    no_cumplido = "no_cumplido"
    cumplido = "cumplido"

class ErrorResponse(BaseModel):
    error: bool = True
    mensaje: str
    codigo: int
    detalles: Optional[Any] = None
