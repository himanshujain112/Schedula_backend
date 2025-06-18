import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninDto } from 'src/dto/signin.dto';
import { SignupDto } from 'src/dto/signup.dto';
import { RefreshDto } from 'src/dto/refresh.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // signup endpoint

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return await this.authService.Signup(dto);
  }

  // signin endpoint

  @Post('signin')
  async signin(@Body() dto: SigninDto) {
    return await this.authService.Signin(dto);
  }

  // signout endpoint
  @Post('signout')
  async signout(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing');
    }
    const token = authHeader.split(' ')[1];
    return await this.authService.signOut(token);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return await this.authService.refresh(dto);
  }
}
