import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignupDto } from 'src/dto/signup.dto';
import { Doctor } from 'src/entities/doctor.entity';
import * as bcrypt from 'bcrypt';
import { SigninDto } from 'src/dto/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshDto } from 'src/dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    private jwtService: JwtService,
  ) {}

  async Signup(signupdto: SignupDto) {
    //checking if email already exists
    const exists = await this.doctorRepository.findOne({
      where: { email: signupdto.email },
    });

    if (exists) {
      throw new ConflictException(`Email ${signupdto.email} already exists`);
    }
    try {
      // hashing the password
      const hashed_pass = await bcrypt.hash(signupdto.password, 10);

      //creating a new doctor entity
      const doctor = this.doctorRepository.create({
        ...signupdto,
        password: hashed_pass,
      });

      // saving the doctor entity to the database
      const save_doctor = await this.doctorRepository.save(doctor);

      return { message: 'Signup successful' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error during signup: ${error.message}`,
      );
    }
  }

  async Signin(dto: SigninDto) {
    // checking if email exists in db

    const doctor = await this.doctorRepository.findOne({
      where: { email: dto.email },
    });
    if (!doctor) {
      throw new ConflictException(`Email ${dto.email} does not exist`);
    }

    // checking if password is correct
    const isPasswordValid = await bcrypt.compare(dto.password, doctor.password);
    if (!isPasswordValid) {
      throw new ConflictException('Invalid password');
    }

    // if everything is fine, generate JWT tokens

    const [access_token, refresh_token] = await this.generateTokens(
      doctor.doctor_id,
      doctor.email,
    );

    // save the refresh token in the database
    doctor.hashed_refresh_token = await bcrypt.hash(refresh_token, 10);
    await this.doctorRepository.save(doctor);

    // if everything is fine, return the doctor entity

    return {
      message: 'Signin successful',
      access_token: access_token,
      refresh_token: refresh_token,
    };
  }

  private async generateTokens(userid: number, email: string) {
    const payload = { sub: userid, email };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });
    return [access_token, refresh_token];
  }

  async signOut(token: string) {
    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    const doctor = await this.doctorRepository.findOne({
      where: { doctor_id: payload['sub'] },
    });
    if (!doctor) {
      throw new ConflictException(`Doctor does not exist`);
    }

    // Clear the hashed refresh token
    doctor.hashed_refresh_token = null;

    await this.doctorRepository.save(doctor);
    console.log('Signing out doctor ID:', payload['sub']);

    return { message: 'Sign out successful' };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const doctor = await this.doctorRepository.findOne({
        where: { doctor_id: payload.sub },
      });
      if (!doctor || !doctor.hashed_refresh_token) {
        throw new UnauthorizedException(`'Refresh token is invalid`);
      }

      const compare_refresh_token = await bcrypt.compare(
        dto.refresh_token,
        doctor.hashed_refresh_token,
      );
      if (!compare_refresh_token) {
        throw new UnauthorizedException(`Refresh token is expired`);
      }

      const [access_token, refresh_token] = await this.generateTokens(
        doctor.doctor_id,
        doctor.email,
      );

      // Save the new refresh token in the database
      doctor.hashed_refresh_token = await bcrypt.hash(refresh_token, 10);
      await this.doctorRepository.save(doctor);
      return {
        message: 'Token refreshed successfully',
        access_token: access_token,
        refresh_token: refresh_token,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error during token refresh: ${error.message}`,
      );
    }
  }
}
