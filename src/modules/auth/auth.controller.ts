import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { UsuarioDTO } from '../usuario/dto/usuario.dto.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto.js';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto.js';
import { LoginRequestDto } from './dto/login-request.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto.js';
import { SeedAdminResponseDto } from './dto/seed-admin-response.dto.js';
import { SignupRequestDto } from './dto/signup-request.dto.js';
import { SignupResponseDto } from './dto/signup-response.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_AUTH_LIMIT) || 5,
      ttl: Number(process.env.THROTTLE_AUTH_TTL_MS) || 60_000,
    },
  })
  @Post('signup')
  @HttpCode(HttpStatus.FORBIDDEN)
  @ApiOperation({
    summary: 'Registro público (deshabilitado)',
    deprecated: true,
    description:
      'Deshabilitado por seguridad. Los usuarios se crean únicamente vía POST /usuario (ADMIN).',
  })
  @ApiBody({ type: SignupRequestDto, required: false })
  @ApiForbiddenResponse({
    description:
      'Registro público deshabilitado. Usar POST /usuario con rol ADMIN.',
  })
  async signup(
    // Body opcional: se ignora; se mantiene el DTO para no romper clientes que aún postean.
    @Body() _body?: SignupRequestDto,
  ): Promise<SignupResponseDto> {
    throw new ForbiddenException({
      code: ERRORS.AUTHORIZATION.FORBIDDEN.CODE,
      message:
        'El registro público está deshabilitado. Los usuarios se crean desde POST /usuario (solo ADMIN).',
    });
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_SEED_LIMIT) || 3,
      ttl: Number(process.env.THROTTLE_AUTH_TTL_MS) || 60_000,
    },
  })
  @Post('seed-admin')
  @ApiOperation({
    summary: 'Crear usuario ADMIN inicial',
    description:
      'Bootstrap idempotente. Requiere SEED_ADMIN_ENABLED=true y NODE_ENV≠production. Credenciales solo desde .env. Si ya existe, autentica.',
  })
  @ApiOkResponse({ type: SeedAdminResponseDto })
  @ApiForbiddenResponse({
    description:
      'Seed deshabilitado, incompleto o bloqueado en producción',
  })
  async seedAdmin(): Promise<SeedAdminResponseDto> {
    return this.authService.seedAdmin();
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_AUTH_LIMIT) || 10,
      ttl: Number(process.env.THROTTLE_AUTH_TTL_MS) || 60_000,
    },
  })
  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Autentica con email y password. Crea una sesión y devuelve access_token + refresh_token (rotativo).',
  })
  @ApiBody({ type: LoginRequestDto, description: 'Credenciales' })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Login exitoso' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  async login(
    @Body() body: LoginRequestDto,
    @Request() req: { headers: Record<string, string | undefined>; ip?: string },
  ): Promise<LoginResponseDto> {
    const usuario = await this.authService.validateUser(
      body.email,
      body.password,
    );
    return this.authService.login(usuario, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: Number(process.env.THROTTLE_REFRESH_LIMIT) || 15,
      ttl: Number(process.env.THROTTLE_AUTH_TTL_MS) || 60_000,
    },
  })
  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar tokens',
    description:
      'Intercambia un refresh_token válido por un nuevo par. El refresh anterior queda invalidado (rotación).',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Tokens renovados' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido o expirado' })
  async refresh(@Body() body: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    return this.authService.refreshTokens(body.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Usuario autenticado',
    description: 'Devuelve los datos del usuario del access_token.',
  })
  @ApiOkResponse({ type: UsuarioDTO, description: 'Usuario actual' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async getCurrentUser(
    @Request() req: { user: RequestUser },
  ): Promise<UsuarioDTO> {
    return this.authService.getCurrentUser(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Revoca la sesión actual en el servidor. El access y refresh de esa sesión dejan de servir. El cliente también debe borrar los tokens locales.',
  })
  @ApiOkResponse({
    description: 'Sesión cerrada',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Sesión cerrada exitosamente' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async logout(
    @Request() req: { user: RequestUser },
  ): Promise<{ message: string }> {
    return this.authService.logout(req.user.id, req.user.sid);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description:
      'Cambia la contraseña y revoca todas las sesiones del usuario. Hay que volver a iniciar sesión.',
  })
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiOkResponse({
    type: ChangePasswordResponseDto,
    description: 'Contraseña actualizada',
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos o no coinciden' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async changePassword(
    @Request() req: { user: RequestUser },
    @Body() body: ChangePasswordRequestDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(body, req.user.id);
  }
}
