import { IsBoolean, IsEmail, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;

  // Obrigatórios: login só é aceito com localização autorizada pelo navegador
  // (o front bloqueia antes de nem chamar essa rota se o usuário negar).
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
