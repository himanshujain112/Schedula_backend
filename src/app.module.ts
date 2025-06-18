import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Timeslot } from './entities/timeslot.entity';
import { Appointment } from './entities/appointment.entity';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: false, // Set to false due to production best practices
      autoLoadEntities: true, // Automatically load entities
    }),

    TypeOrmModule.forFeature([Doctor, Patient, Timeslot, Appointment]),

    AuthModule,
  ],

  controllers: [AppController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
