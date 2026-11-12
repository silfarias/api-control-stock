import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Fila única (id = 1) con el último número de transferencia emitido (numeración GLOBAL).
 * Se bloquea con FOR UPDATE al crear una transferencia para evitar duplicados.
 */
@Entity('transferencia_numeracion')
export class TransferenciaNumeracion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'ultimo_numero', type: 'int', unsigned: true, default: 0 })
  ultimoNumero: number;
}
