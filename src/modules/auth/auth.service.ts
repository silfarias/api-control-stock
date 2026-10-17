import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  getAccessTokenSecret,
  getRefreshTokenSecret,
} from '../../config/auth-secrets.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { CreateUsuarioRequestDto } from '../usuario/dto/create-usuario-request.dto.js';
import { UsuarioDTO } from '../usuario/dto/usuario.dto.js';
import { UsuarioService } from '../usuario/usuario.service.js';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto.js';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { SignupRequestDto } from './dto/signup-request.dto.js';
import { SignupResponseDto } from './dto/signup-response.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
  ) {}

  private getAccessTokenExpiresIn(): string {
    return process.env.ACCESS_TOKEN_EXPIRES_IN || '1d';
  }

  private getRefreshTokenExpiresIn(): string {
    return process.env.ACCESS_TOKEN_REFRESH_EXPIRES_IN || '30d';
  }

  private buildPayload(usuario: UsuarioDTO) {
    return {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
    };
  }

  private generateTokenPair(usuario: UsuarioDTO): {
    access_token: string;
    refresh_token: string;
  } {
    const payload = this.buildPayload(usuario);
    const access_token = this.jwtService.sign(payload, {
      secret: getAccessTokenSecret(),
      expiresIn: this.getAccessTokenExpiresIn() as any,
    });
    const refresh_token = this.jwtService.sign(
      { sub: usuario.id },
      {
        secret: getRefreshTokenSecret(),
        expiresIn: this.getRefreshTokenExpiresIn() as any,
      },
    );
    return { access_token, refresh_token };
  }

  async validateUser(email: string, password: string): Promise<UsuarioDTO> {
    return this.usuarioService.login(email, password);
  }

  async login(usuario: UsuarioDTO): Promise<LoginResponseDto> {
    const { access_token, refresh_token } = this.generateTokenPair(usuario);
    return {
      access_token,
      refresh_token,
      expires_in: this.getAccessTokenExpiresIn(),
      usuario,
    };
  }

  async refreshTokens(refreshToken: string): Promise<LoginResponseDto> {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException({
        code: ERRORS.VALIDATION.INVALID_INPUT.CODE,
        message: 'Refresh token es requerido',
      });
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: getRefreshTokenSecret(),
      }) as { sub: number | string };

      const userId =
        typeof payload.sub === 'string'
          ? parseInt(payload.sub, 10)
          : payload.sub;

      if (Number.isNaN(userId)) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const usuario = await this.usuarioService.findOne(userId);
      const { access_token, refresh_token } = this.generateTokenPair(usuario);

      return {
        access_token,
        refresh_token,
        expires_in: this.getAccessTokenExpiresIn(),
        usuario,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: 'Refresh token inválido o expirado',
      });
    }
  }

  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    const createDto: CreateUsuarioRequestDto = {
      nombre: signupDto.nombre,
      email: signupDto.email,
      password: signupDto.password,
      role: UsuarioRole.EMPLEADO,
    };

    const usuario = await this.usuarioService.create(createDto);
    const { access_token, refresh_token } = this.generateTokenPair(usuario);

    return {
      access_token,
      refresh_token,
      expires_in: this.getAccessTokenExpiresIn(),
      usuario,
      message: 'Usuario registrado y autenticado exitosamente',
    };
  }

  async getCurrentUser(userId: number): Promise<UsuarioDTO> {
    return this.usuarioService.findOne(userId);
  }

  async changePassword(
    changePasswordDto: ChangePasswordRequestDto,
    userId: number,
  ): Promise<ChangePasswordResponseDto> {
    const usuario = await this.usuarioService.changePassword(
      userId,
      changePasswordDto.password,
    );
    return {
      message: 'Contraseña cambiada exitosamente',
      usuario,
    };
  }

  async logout(_userId: number): Promise<{ message: string }> {
    return { message: 'Sesión cerrada exitosamente' };
  }
}
