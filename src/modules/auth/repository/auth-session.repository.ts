import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { AuthSession } from '../entities/auth-session.entity.js';

@Injectable()
export class AuthSessionRepository extends Repository<AuthSession> {
  constructor(private readonly dataSource: DataSource) {
    super(AuthSession, dataSource.createEntityManager());
  }

  async findByIdForUpdate(
    manager: EntityManager,
    sessionId: string,
  ): Promise<AuthSession | null> {
    return manager
      .getRepository(AuthSession)
      .createQueryBuilder('session')
      .setLock('pessimistic_write')
      .where('session.id = :sessionId', { sessionId })
      .getOne();
  }

  async findActiveById(sessionId: string): Promise<AuthSession | null> {
    return this.createQueryBuilder('session')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now: new Date() })
      .getOne();
  }

  async revokeById(sessionId: string, at = new Date()): Promise<void> {
    await this.update({ id: sessionId, revokedAt: IsNull() }, { revokedAt: at });
  }

  async revokeAllForUser(usuarioId: number, at = new Date()): Promise<void> {
    await this.createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: at })
      .where('usuario_id = :usuarioId', { usuarioId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }
}
