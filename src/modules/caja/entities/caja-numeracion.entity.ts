import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Fila única (id = 1) con el último número de caja emitido.
 * Se bloquea con FOR UPDATE al abrir una caja para evitar duplicados.
 */
@Entity('caja_numeracion')
export class CajaNumeracion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'ultimo_numero', type: 'int', unsigned: true, default: 0 })
  ultimoNumero: number;
}
