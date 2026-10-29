import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Fila única (id = 1) con el último número de comprobante emitido.
 * Se bloquea con FOR UPDATE al crear una venta para evitar duplicados.
 */
@Entity('venta_numeracion')
export class VentaNumeracion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'ultimo_numero', type: 'int', unsigned: true, default: 0 })
  ultimoNumero: number;
}
