import {
  ConflictException,
  ForbiddenException,
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
import { MoreThanOrEqual, Repository } from 'typeorm';
import * as dayjs from 'dayjs';

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

    // Check for existing session booking
    const existingAppointments = await this.appointmentRepo.find({
      where: {
        doctor: { doctor_id: dto.doctor_id },
        patient: { patient_id: patient.patient_id },
        appointment_date: slotDate,
      },
    });

    for (const app of existingAppointments) {
      const existingSlot = await this.slotRepo.findOne({
        where: {
          doctor: { doctor_id: dto.doctor_id },
          slot_date: slotDate,
          slot_time: app.time_slot,
        },
      });

      if (existingSlot?.session === dto.session) {
        throw new ConflictException(
          'You already have an appointment in this session with this doctor on this date.',
        );
      }
    }

    // Determine reporting time
    let reportingTime = dto.start_time; // default for stream

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

      if (count >= doctor.patients_per_slot) {
        throw new ConflictException('Wave limit reached for this slot');
      }

      const subSlotMinutes = Math.floor(
        doctor.slot_duration / doctor.patients_per_slot,
      );

      reportingTime = dayjs(`${dto.date}T${dto.start_time}`)
        .add(count * subSlotMinutes, 'minute')
        .format('HH:mm');
    }

    // Save appointment
    const appointment = this.appointmentRepo.create({
      doctor,
      patient,
      appointment_date: slotDate,
      time_slot: dto.start_time,
      reporting_time: reportingTime,
      appointment_status: 'pending',
      reason: dto.reason || 'Checkup',
      notes: dto.notes || '',
    });

    await this.appointmentRepo.save(appointment);

    return {
      message: 'Appointment booked successfully',
      schedule_type: doctor.schedule_type,
      reporting_time: reportingTime,
    };
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw new InternalServerErrorException(
      error.message || 'Something went wrong during booking',
    );
  }
}


  async view_appointments(user: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let appointments: Appointment[] = [];

    if (user.role === 'patient') {
      const patient = await this.patientRepo.findOne({
        where: { user: { user_id: user.sub } },
      });
      if (!patient) throw new NotFoundException('Patient not found');

      appointments = await this.appointmentRepo.find({
        relations: ['doctor', 'patient'],
        where: {
          patient: { patient_id: patient.patient_id },
          appointment_date: MoreThanOrEqual(today),
        },
        order: {
          appointment_date: 'ASC' as const,
        },
      });
    } else if (user.role === 'doctor') {
      const doctor = await this.doctorRepo.findOne({
        where: { user: { user_id: user.sub } },
      });
      if (!doctor) throw new NotFoundException('Doctor not found');

      appointments = await this.appointmentRepo.find({
        relations: ['doctor', 'patient'],
        where: {
          doctor: { doctor_id: doctor.doctor_id },
          appointment_date: MoreThanOrEqual(today),
        },
        order: {
          appointment_date: 'ASC' as const,
        },
      });
    } else {
      throw new ForbiddenException('Invalid role');
    }

    return appointments.map((a) => ({
      appointment_id: a.appointment_id,
      doctor_name: `Dr. ${a.doctor.first_name} ${a.doctor.last_name}`,
      specialization: a.doctor.specialization || 'N/A',
      patient_name: `${a.patient.first_name} ${a.patient.last_name}`,
      appointment_date: dayjs(a.appointment_date).format('YYYY-MM-DD'),
      appointment_time: dayjs(`2000-01-01T${a.time_slot}`).format('hh:mm A'),
      status: a.appointment_status,
      reason: a.reason,
      notes: a.notes || 'None',
    }));
  }
}
