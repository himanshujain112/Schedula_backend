import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Doctor } from 'src/entities/doctor.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,
  ) {}

  async getDoctors(name?: string, specialization?: string) {
    const queryBuilder = this.doctorRepo.createQueryBuilder('doctor');

    if (name) {
      queryBuilder.andWhere(
        `(LOWER(doctor.first_name) ILIKE :name OR LOWER(doctor.last_name) ILIKE :name)`,
        { name: `%${name.toLowerCase()}%` },
      );
    }

    if (specialization) {
      queryBuilder.andWhere(
        `LOWER(doctor.specialization) ILIKE :specialization`,
        { specialization: `%${specialization.toLowerCase()}%` },
      );
    }
    return queryBuilder.getMany();
  }

  async getDoctorByID(id: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: id },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found with this id!');
    }

    return doctor;
  }
}
