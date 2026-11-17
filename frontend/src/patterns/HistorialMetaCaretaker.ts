import {
  MementoDTO,
  obtenerMementosMetaAPI,
  guardarSnapshotMetaAPI,
  deshacerEstadoMetaAPI,
  restaurarMementoMetaAPI,
  cambiarEstadoMetaAPI,
} from "@/services/api";

export enum EstadoMeta {
  EN_PROGRESO = "EN_PROGRESO",
  COMPLETADA = "COMPLETADA",
  CANCELADA = "CANCELADA",
}

/**
 * «Memento» (Representación cliente)
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
      dto.nota || "Snapshot de estado"
    );
  }
}

/**
 * «Caretaker Controller» (HistorialMetaCaretaker)
 * Coordina desde la aplicación cliente el almacenamiento, consulta y restauración
 * de Mementos comunicándose con el módulo Originator en FastAPI.
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

  public listarHistorial(): MetaAhorroMemento[] {
    return [...this.historial];
  }

  public async cargarHistorial(): Promise<MetaAhorroMemento[]> {
    const dtos = await obtenerMementosMetaAPI(this.metaId);
    this.historial = dtos.map(MetaAhorroMemento.fromDTO);
    return this.listarHistorial();
  }

  public async guardarSnapshot(nota?: string): Promise<MetaAhorroMemento> {
    const dto = await guardarSnapshotMetaAPI(this.metaId, nota);
    const memento = MetaAhorroMemento.fromDTO(dto);
    this.agregarMemento(memento);
    return memento;
  }

  public async deshacer(): Promise<{
    memento: MetaAhorroMemento;
    mensaje: string;
    meta: any;
  }> {
    const res = await deshacerEstadoMetaAPI(this.metaId);
    const memento = MetaAhorroMemento.fromDTO(res.memento_restaurado);
    if (this.historial.length > 0) {
      this.historial.pop();
    }
    return {
      memento,
      mensaje: res.mensaje,
      meta: res.meta,
    };
  }

  public async restaurarEnIndice(index: number): Promise<{
    memento: MetaAhorroMemento;
    mensaje: string;
    meta: any;
  }> {
    const res = await restaurarMementoMetaAPI(this.metaId, index);
    const memento = MetaAhorroMemento.fromDTO(res.memento_restaurado);
    this.historial = this.historial.slice(0, index);
    return {
      memento,
      mensaje: res.mensaje,
      meta: res.meta,
    };
  }

  public async cambiarEstado(estado: EstadoMeta) {
    return cambiarEstadoMetaAPI(this.metaId, estado);
  }
}
