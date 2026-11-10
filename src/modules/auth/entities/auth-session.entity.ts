import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity.js';

/**
 * Sesión de autenticación (un dispositivo / navegador).
 * Solo se persiste el hash SHA-256 del refresh token, nunca el token en claro.
 * Esquema: migración `InitialSchema` (`src/database/migrations`).
 */
@Entity('auth_session')
export class AuthSession {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Index('idx_auth_session_usuario')
  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /** SHA-256 hex del refresh token actual. */
  @Index('uq_auth_session_refresh_hash', { unique: true })
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64 })
  refreshTokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedAt: Date;
}
