import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateAppointmentDto } from 'src/dto/create_appointment.dto';
import { Appointment } from 'src/entities/appointment.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { Patient } from 'src/entities/patient.entity';
import { Timeslot } from 'src/entities/timeslot.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,

    @InjectRepository(Timeslot)
    private slotRepo: Repository<Timeslot>,

    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,

    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
  ) {}

  async bookAppointment(dto: CreateAppointmentDto, user: any) {
  try {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: dto.doctor_id },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const patient = await this.patientRepo.findOne({
      where: { user: { user_id: user.sub } },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const slotDate = new Date(dto.date);

    const slot = await this.slotRepo.findOne({
      where: {
        doctor: { doctor_id: dto.doctor_id },
        slot_date: slotDate,
        slot_time: dto.start_time,
        session: dto.session,
      },
    });

    if (!slot) throw new NotFoundException('Slot not found');

    // Check if patient already has an appointment for this slot
    const existingAppointment = await this.appointmentRepo.findOne({
      where: {
        doctor: { doctor_id: dto.doctor_id },
        patient: { patient_id: patient.patient_id },
        appointment_date: slotDate,
        time_slot: dto.start_time,
      },
    });

    if (existingAppointment) {
      throw new ConflictException('You already booked this slot');
    }

    if (doctor.schedule_type === 'stream') {
      if (!slot.is_available) {
        throw new ConflictException('Slot already booked');
      }

      slot.is_available = false;
      await this.slotRepo.save(slot);
    }

    if (doctor.schedule_type === 'wave') {
      const count = await this.appointmentRepo.count({
        where: {
          doctor: { doctor_id: dto.doctor_id },
          appointment_date: slotDate,
          time_slot: dto.start_time,
        },
      });

      if (count >= 3) {
        throw new ConflictException('Wave limit reached for this slot');
      }
    }

    const appointment = this.appointmentRepo.create({
      doctor,
      patient,
      appointment_date: slotDate,
      time_slot: dto.start_time,
      appointment_status: 'pending',
      reason: dto.reason || 'Checkup',
      notes: dto.notes || '',
    });

    await this.appointmentRepo.save(appointment);

    return {
      message: 'Appointment booked successfully',
      schedule_type: doctor.schedule_type,
    };
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw new InternalServerErrorException(
      error.message || 'Something went wrong during booking',
    );
  }
}

}
