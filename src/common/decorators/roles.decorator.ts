import { SetMetadata } from '@nestjs/common';
import { UsuarioRole } from '../enums/usuario-role.enum.js';

export const ROLES_KEY = 'roles';

/** Declara los roles permitidos en un endpoint. Usar con RolesGuard. */
export const Roles = (...roles: UsuarioRole[]) => SetMetadata(ROLES_KEY, roles);
