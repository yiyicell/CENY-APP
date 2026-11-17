import { MementoDTO, obtenerMementosMetaAPI } from "@/services/api";

export enum EstadoMeta {
  EN_PROGRESO = "EN_PROGRESO",
  COMPLETADA = "COMPLETADA",
  CANCELADA = "CANCELADA",
}

/**
 * «Memento» (Modelo interno del historial de estados en cliente)
 */
export class MetaAhorroMemento {
  private readonly montoActual: number;
  private readonly estado: EstadoMeta;
  private readonly fechaRegistro: Date;
  private readonly id: string;
  private readonly nota: string;

  constructor(
    montoActual: number,
    estado: EstadoMeta,
    fechaRegistro: Date,
    id: string = "",
    nota: string = ""
  ) {
    this.montoActual = montoActual;
    this.estado = estado;
    this.fechaRegistro = fechaRegistro;
    this.id = id;
    this.nota = nota;
  }

  public getMontoActual(): number {
    return this.montoActual;
  }

  public getEstado(): EstadoMeta {
    return this.estado;
  }

  public getFechaRegistro(): Date {
    return this.fechaRegistro;
  }

  public getId(): string {
    return this.id;
  }

  public getNota(): string {
    return this.nota;
  }

  public static fromDTO(dto: MementoDTO): MetaAhorroMemento {
    return new MetaAhorroMemento(
      Number(dto.monto_actual),
      (dto.estado as EstadoMeta) || EstadoMeta.EN_PROGRESO,
      new Date(dto.fecha_registro),
      dto.id,
      dto.nota || "Registro de estado"
    );
  }
}

/**
 * «Caretaker» (HistorialMetaCaretaker)
 * Mantiene internamente la trazabilidad de estados de una meta de ahorro
 * sin exponer operaciones destructivas en la interfaz del usuario.
 */
export class HistorialMetaCaretaker {
  private historial: MetaAhorroMemento[] = [];
  private readonly metaId: string;

  constructor(metaId: string) {
    this.metaId = metaId;
  }

  public agregarMemento(memento: MetaAhorroMemento): void {
    this.historial.push(memento);
  }

  public obtenerMemento(index: number): MetaAhorroMemento {
    if (index < 0 || index >= this.historial.length) {
      throw new Error("Índice de memento fuera de rango");
    }
    return this.historial[index];
  }

  public deshacer(): MetaAhorroMemento {
    const ultimo = this.historial.pop();
    if (!ultimo) {
      throw new Error("No hay estados previos en el historial.");
    }
    return ultimo;
  }

  public listarHistorial(): MetaAhorroMemento[] {
    return [...this.historial];
  }

  public async cargarHistorial(): Promise<MetaAhorroMemento[]> {
    const dtos = await obtenerMementosMetaAPI(this.metaId);
    this.historial = dtos.map(MetaAhorroMemento.fromDTO);
    return this.listarHistorial();
  }
}
