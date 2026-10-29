import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Una sola fila: encabezado, papel y pie del ticket impreso. */
@Entity('ticket')
export class Ticket {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /** Siempre 1. Impide insertar una segunda configuración. */
  @Column({ type: 'tinyint', unique: true, default: 1 })
  unica: number;

  @Column({ name: 'paper_mm', type: 'int', default: 80 })
  paperMm: number;

  @Column({ type: 'varchar', length: 120, default: '' })
  comercio: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  direccion: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  telefono: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  cuit: string;

  @Column({
    type: 'varchar',
    length: 200,
    default: 'Gracias por su compra',
  })
  mensaje: string;

  @CreateDateColumn({ name: 'created_date' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedAt: Date;
}
