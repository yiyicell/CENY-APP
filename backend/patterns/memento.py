from enum import Enum
from datetime import date, datetime
from typing import List, Optional, Dict, Any
import uuid


class EstadoMeta(str, Enum):
    """
    Enumeración del estado de una meta de ahorro según el diagrama UML del Patrón Memento.
    Mantiene equivalencia directa con el enum `estado_meta` de PostgreSQL/Supabase.
    """

    EN_PROGRESO = "EN_PROGRESO"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"

    @classmethod
    def desde_db(cls, valor: Optional[str]) -> "EstadoMeta":
        mapa = {
            "por_cumplir": cls.EN_PROGRESO,
            "cumplido": cls.COMPLETADA,
            "no_cumplido": cls.CANCELADA,
            "EN_PROGRESO": cls.EN_PROGRESO,
            "COMPLETADA": cls.COMPLETADA,
            "CANCELADA": cls.CANCELADA,
        }
        return mapa.get(str(valor or ""), cls.EN_PROGRESO)

    def a_db(self) -> str:
        mapa = {
            EstadoMeta.EN_PROGRESO: "por_cumplir",
            EstadoMeta.COMPLETADA: "cumplido",
            EstadoMeta.CANCELADA: "no_cumplido",
        }
        return mapa[self]


class MetaAhorroMemento:
    """
    «Memento»
    Almacena una fotografía inmutable (snapshot) del estado interno de MetaAhorro
    en un punto específico del tiempo.
    """

    def __init__(
        self,
        montoActual: float,
        estado: EstadoMeta,
        fechaRegistro: Optional[datetime] = None,
        memento_id: Optional[str] = None,
        nota: Optional[str] = None,
        aportes_ids: Optional[List[str]] = None,
    ) -> None:
        self._monto_actual: float = round(float(montoActual), 2)
        self._estado: EstadoMeta = (
            estado if isinstance(estado, EstadoMeta) else EstadoMeta.desde_db(str(estado))
        )
        self._fecha_registro: datetime = fechaRegistro or datetime.now()
        self._memento_id: str = memento_id or str(uuid.uuid4())
        self._nota: str = nota or "Snapshot de estado"
        self._aportes_ids: Optional[List[str]] = (
            list(aportes_ids) if aportes_ids is not None else None
        )

    def getMontoActual(self) -> float:
        return self._monto_actual

    def getEstado(self) -> EstadoMeta:
        return self._estado

    def getFechaRegistro(self) -> datetime:
        return self._fecha_registro

    def getId(self) -> str:
        return self._memento_id

    def getNota(self) -> str:
        return self._nota

    def getAportesIds(self) -> Optional[List[str]]:
        return list(self._aportes_ids) if self._aportes_ids is not None else None

    def to_dict(self, meta_id: Optional[str] = None) -> Dict[str, Any]:
        datos: Dict[str, Any] = {
            "id": self._memento_id,
            "monto_actual": self._monto_actual,
            "estado": self._estado.value,
            "fecha_registro": self._fecha_registro.isoformat(),
            "nota": self._nota,
        }
        if meta_id is not None:
            datos["meta_id"] = meta_id
        if self._aportes_ids is not None:
            datos["aportes_ids"] = list(self._aportes_ids)
        return datos

    @classmethod
    def from_dict(cls, datos: Dict[str, Any]) -> "MetaAhorroMemento":
        fecha_raw = datos.get("fecha_registro")
        if isinstance(fecha_raw, datetime):
            fecha = fecha_raw
        elif isinstance(fecha_raw, str):
            try:
                fecha = datetime.fromisoformat(fecha_raw.replace("Z", "+00:00"))
            except ValueError:
                fecha = datetime.now()
        else:
            fecha = datetime.now()

        aportes_ids = datos.get("aportes_ids")
        return cls(
            montoActual=float(datos.get("monto_actual", 0.0)),
            estado=EstadoMeta.desde_db(datos.get("estado")),
            fechaRegistro=fecha,
            memento_id=str(datos.get("id")) if datos.get("id") else None,
            nota=datos.get("nota"),
            aportes_ids=list(aportes_ids) if isinstance(aportes_ids, list) else None,
        )


class HistorialMetaCaretaker:
    """
    «Caretaker»
    Administra el historial cronológico de Mementos (snapshots) de una meta de ahorro
    sin modificar su contenido interno.
    """

    def __init__(self, historial_inicial: Optional[List[MetaAhorroMemento]] = None) -> None:
        self._historial: List[MetaAhorroMemento] = list(historial_inicial or [])

    def agregarMemento(self, memento: MetaAhorroMemento) -> None:
        self._historial.append(memento)

    def obtenerMemento(self, index: int) -> MetaAhorroMemento:
        if index < 0 or index >= len(self._historial):
            raise IndexError(
                f"Índice de memento fuera de rango ({index}). Total disponible: {len(self._historial)}"
            )
        return self._historial[index]

    def deshacer(self) -> MetaAhorroMemento:
        if not self._historial:
            raise ValueError("No hay estados previos en el historial para deshacer.")
        return self._historial.pop()

    def listarHistorial(self) -> List[MetaAhorroMemento]:
        return list(self._historial)

    def totalMementos(self) -> int:
        return len(self._historial)


class MetaAhorro:
    """
    «Originator»
    Representa la meta de ahorro cuyo estado evoluciona mediante abonos o cambios de estado,
    y que sabe crear y restaurar su propio MetaAhorroMemento.
    """

    def __init__(
        self,
        idMeta: str,
        nombreMeta: str,
        montoObjetivo: float,
        montoActual: float = 0.0,
        fechaLimite: Optional[date] = None,
        estado: EstadoMeta = EstadoMeta.EN_PROGRESO,
        caretaker: Optional[HistorialMetaCaretaker] = None,
    ) -> None:
        self._id_meta: str = str(idMeta)
        self._nombre_meta: str = nombreMeta
        self._monto_objetivo: float = round(float(montoObjetivo), 2)
        self._monto_actual: float = round(float(montoActual), 2)
        self._fecha_limite: date = fechaLimite or date.today()
        self._estado: EstadoMeta = (
            estado if isinstance(estado, EstadoMeta) else EstadoMeta.desde_db(str(estado))
        )
        self._caretaker: HistorialMetaCaretaker = caretaker or HistorialMetaCaretaker()

    def abonarMeta(self, monto: float) -> None:
        monto_val = round(float(monto), 2)
        if monto_val <= 0:
            raise ValueError("El monto del aporte debe ser mayor a cero.")
        if self._estado == EstadoMeta.CANCELADA:
            raise ValueError(
                "No se pueden registrar aportes en una meta cancelada. Reanuda la meta o restaura un estado previo."
            )

        self._monto_actual = round(self._monto_actual + monto_val, 2)
        if self._monto_actual >= self._monto_objetivo and self._monto_objetivo > 0:
            self._estado = EstadoMeta.COMPLETADA

    def cancelarMeta(self) -> None:
        self._estado = EstadoMeta.CANCELADA

    def reanudarMeta(self) -> None:
        if self._monto_actual >= self._monto_objetivo and self._monto_objetivo > 0:
            self._estado = EstadoMeta.COMPLETADA
        else:
            self._estado = EstadoMeta.EN_PROGRESO

    def guardarEstado(
        self,
        nota: Optional[str] = None,
        aportes_ids: Optional[List[str]] = None,
    ) -> MetaAhorroMemento:
        return MetaAhorroMemento(
            montoActual=self._monto_actual,
            estado=self._estado,
            fechaRegistro=datetime.now(),
            nota=nota,
            aportes_ids=aportes_ids,
        )

    def restaurarEstado(self, memento: MetaAhorroMemento) -> None:
        self._monto_actual = memento.getMontoActual()
        self._estado = memento.getEstado()

    def getCaretaker(self) -> HistorialMetaCaretaker:
        return self._caretaker

    def getIdMeta(self) -> str:
        return self._id_meta

    def getNombreMeta(self) -> str:
        return self._nombre_meta

    def getMontoObjetivo(self) -> float:
        return self._monto_objetivo

    def getMontoActual(self) -> float:
        return self._monto_actual

    def getFechaLimite(self) -> date:
        return self._fecha_limite

    def getEstado(self) -> EstadoMeta:
        return self._estado
