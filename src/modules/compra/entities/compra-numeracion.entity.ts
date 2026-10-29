import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Fila única (id = 1) con el último número de comprobante de compra emitido.
 * Se bloquea con FOR UPDATE al crear una compra para evitar duplicados.
 */
@Entity('compra_numeracion')
export class CompraNumeracion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'ultimo_numero', type: 'int', unsigned: true, default: 0 })
  ultimoNumero: number;
}
