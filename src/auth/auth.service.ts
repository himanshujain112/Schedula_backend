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
import { User } from 'src/entities/user.entity';
import e from 'express';
import { Patient } from 'src/entities/patient.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private jwtService: JwtService,
  ) {}

  async Signup(signupdto: SignupDto) {
    //checking if email already exists
    const exists = await this.userRepository.findOne({
      where: { email: signupdto.email },
    });

    if (exists) {
      throw new ConflictException(`Email ${signupdto.email} already exists`);
    }
    try {
      // hashing the password
      const hashed_pass = await bcrypt.hash(signupdto.password, 10);

      //creating a new user entity
      const user = this.userRepository.create({
        email: signupdto.email,
        role: signupdto.role,
        password: hashed_pass,
      });

      // saving the user entity to the database
      const userSaved = await this.userRepository.save(user);

      // if the user is a doctor, create a doctor entity
      if (signupdto.role === 'doctor') {
        const doctor = this.doctorRepository.create({
          user: userSaved,
          first_name: signupdto.first_name,
          last_name: signupdto.last_name,
          specialization: signupdto.specialization,
          phoneNumber: signupdto.phone_number,
          education: signupdto.education,
          experience_years: signupdto.experience,
          available_days: signupdto.available_days,
          available_time_slots: signupdto.available_time_slots,
          clinic_name: signupdto.clinic_name,
          clinic_address: signupdto.clinic_address,
        });
        await this.doctorRepository.save(doctor);
      } else if (signupdto.role === 'patient') {
        // If the user is a patient
        const patient = this.patientRepository.create({
          user: userSaved,
          first_name: signupdto.first_name,
          last_name: signupdto.last_name,
          phone_number: signupdto.phone_number,
          dob: signupdto.dob,
          patient_address: signupdto.patient_address,
          gender: signupdto.gender,
          emergency_contact: signupdto.emergency_contact,
        });
        await this.patientRepository.save(patient);
      }
      // if everything is fine, return a success message
      console.log(
        `User ${signupdto.email} signed up with role: ${signupdto.role}`,
      );
      return { message: 'Signup successful' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error during signup: ${error.message}`,
      );
    }
  }

  async Signin(dto: SigninDto) {
    // checking if email exists in db

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new ConflictException(`Email ${dto.email} does not exist`);
    }

    // checking if password is correct
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ConflictException('Invalid password');
    }

    // if everything is fine, generate JWT tokens

    const [access_token, refresh_token] = await this.generateTokens(
      user.user_id,
      user.email,
      user.role,
    );

    // save the refresh token in the database
    user.hashed_refresh_token = await bcrypt.hash(refresh_token, 10);
    await this.userRepository.save(user);

    // if everything is fine, return the doctor entity
    console.log(`User ${user.email} signed in with role: ${user.role}`);

    return {
      message: 'Signin successful',
      role: user.role,
      access_token: access_token,
      refresh_token: refresh_token,
    };
  }

  private async generateTokens(userid: number, email: string, role: string) {
    const payload = { sub: userid, email, role: role };

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
    const user = await this.userRepository.findOne({
      where: { user_id: payload['sub'] },
    });
    if (!user) {
      throw new ConflictException(`User does not exist`);
    }

    // Clear the hashed refresh token
    user.hashed_refresh_token = null;

    await this.userRepository.save(user);
    console.log('Signing out User :', user.email);

    return { message: 'Sign out successful' };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.userRepository.findOne({
        where: { user_id: payload.sub },
      });
      if (!user || !user.hashed_refresh_token) {
        throw new UnauthorizedException(`'Refresh token is invalid`);
      }

      const compare_refresh_token = await bcrypt.compare(
        dto.refresh_token,
        user.hashed_refresh_token,
      );
      if (!compare_refresh_token) {
        throw new UnauthorizedException(`Refresh token is expired`);
      }

      const [access_token, refresh_token] = await this.generateTokens(
        user.user_id,
        user.email,
        user.role,
      );

      // Save the new refresh token in the database
      user.hashed_refresh_token = await bcrypt.hash(refresh_token, 10);
      await this.userRepository.save(user);
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
