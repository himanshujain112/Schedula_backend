import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateAvailabilityDto } from 'src/dto/availablity.dto';
import { Doctor } from 'src/entities/doctor.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Timeslot } from 'src/entities/timeslot.entity';
import { DoctorAvailability } from 'src/entities/doctor_availablity.entity';
import { UpdateTimeSlotDto } from 'src/dto/update_time_slot.dto';
import { CreateManualSlotDto } from 'src/dto/manual_slot.dto';
import { SetBookingWindowDto } from 'src/dto/booking_window.dto';
import { UpdateAppointmentStatusDto } from 'src/dto/appointment_status.dto';
import { Appointment } from 'src/entities/appointment.entity';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,

    @InjectRepository(Timeslot)
    private slotRepo: Repository<Timeslot>,

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,

    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
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

  async createAvailability(doctorId: number, dto: CreateAvailabilityDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    // ✅ 1. Check if date is in the past
    const today = dayjs().startOf('day');
    const requestedDate = dayjs(dto.date);
    if (requestedDate.isBefore(today)) {
      throw new BadRequestException(
        'Cannot create availability for a past date',
      );
    }

    // Doctor entity update to update patient per slot and session time
    doctor.patients_per_slot = dto.patients_per_slot || 3;
    doctor.slot_duration = dto.slot_duration || 30;

    const doc = await this.doctorRepo.save(doctor);

    // ✅ 2. Save availability record
    const availability = this.availabilityRepo.create({
      doctor,
      date: dto.date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      session: dto.session,
      weekday: dto.weekday,
    });

    const savedAvailability = await this.availabilityRepo.save(availability);

    // ✅ 3. Use dayjs to split time
    const start = dayjs(`${dto.date}T${dto.start_time}`);
    const end = dayjs(`${dto.date}T${dto.end_time}`);

    // Get slot duration from DTO or doctor default
    const slotDuration = dto.slot_duration || doctor.slot_duration;

    console.log('Slot creation debug:', {
      date: dto.date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      start: start.format('YYYY-MM-DD HH:mm'),
      end: end.format('YYYY-MM-DD HH:mm'),
      slotDuration,
    });

    const slots: Timeslot[] = [];
    let current = start;

    while (current.isBefore(end)) {
      const slotTime = current.format('HH:mm');
      const slotDate = new Date(dto.date);

      console.log('Creating slot for:', {
        time: slotTime,
        date: slotDate,
        current: current.format('YYYY-MM-DD HH:mm'),
      });

      // ✅ 4. Prevent duplicate slot (same doctor + date + time)
      const existing = await this.slotRepo.findOne({
        where: {
          doctor: { doctor_id: doctorId },
          slot_date: slotDate,
          slot_time: slotTime,
        },
      });

      if (!existing) {
        const slot = this.slotRepo.create({
          doctor,
          availability: savedAvailability,
          slot_date: slotDate,
          slot_time: slotTime,
          is_available: true,
          session: dto.session,
        });

        slots.push(slot);
      } else {
        console.log('Duplicate slot found, skipping:', { slotTime, slotDate });
      }

      current = current.add(slotDuration, 'minute');
    }

    console.log('Total slots to create:', slots.length);

    // Ensure at least one slot is created
    if (slots.length === 0) {
      // Check if the time range is valid
      if (start.isAfter(end) || start.isSame(end)) {
        throw new BadRequestException(
          'Invalid time range: start time must be before end time',
        );
      }

      // Check if all slots already exist
      const allSlotsExist = await this.slotRepo.count({
        where: {
          doctor: { doctor_id: doctorId },
          slot_date: new Date(dto.date),
        },
      });

      if (allSlotsExist > 0) {
        throw new ConflictException(
          `Slots already exist for doctor ${doctorId} on ${dto.date}. Found ${allSlotsExist} existing slots.`,
        );
      }

      throw new BadRequestException(
        'At least one slot must be created within the availability session. Please check your start_time, end_time, and slot_duration.',
      );
    }

    await this.slotRepo.save(slots);

    return {
      message: 'Availability and slots created',
      total_slots: slots.length,
      schedule_type: doctor.schedule_type,
      slot_duration: dto.slot_duration,
      patient_per_slot: dto.patients_per_slot,
    };
  }

  async getAvailableSlots(doctorId: number, page: number, limit: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const today = dayjs().startOf('day').toDate();

    const [slots, total] = await this.slotRepo.findAndCount({
      where: {
        doctor: { doctor_id: doctorId },
        is_available: true,
        slot_date: MoreThanOrEqual(today), // ✅ Only today or future
      },
      relations: ['availability'],
      order: {
        slot_date: 'ASC',
        slot_time: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const grouped = slots.reduce(
      (acc, slot) => {
        const date = new Date(slot.slot_date).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push({
          slot_id: slot.slot_id,
          slot_time: slot.slot_time,
          session: slot.session,
          is_available: slot.is_available,
          booked_count: slot.booked_count,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return {
      doctor_id: doctorId,
      total_slots: total,
      page,
      limit,
      data: grouped,
    };
  }

  // doctor schedule type set (wave/stream)

  async setScheduleType(doctorId: number, schedule_type: 'stream' | 'wave') {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with id ${doctorId} not found!`);
    }

    try {
      doctor.schedule_type = schedule_type;

      await this.doctorRepo.save(doctor);
      console.log(`schedule type of ${doctorId} updated to ${schedule_type}`);
      return {
        message: `Success! Schedule Type updated to ${schedule_type}`,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error updating schedule type: ${error.message}`,
      );
    }
  }

  async deleteTimeSlot(user_id: number, doctorId: number, slotId: number) {
    // 1. Find the doctor making the request
    const doctor = await this.doctorRepo.findOne({
      where: { user: { user_id: user_id } },
    });

    if (!doctor) {
      throw new NotFoundException(
        'Doctor profile not found for the logged-in user.',
      );
    }

    // 2. Verify doctor ID matches
    if (doctor.doctor_id !== doctorId) {
      throw new ForbiddenException(
        'You are not authorized to access this doctor profile.',
      );
    }

    // 2. Find the time slot to be deleted
    const timeSlot = await this.slotRepo.findOne({
      where: { slot_id: slotId },
      relations: ['doctor'], // We need to load the doctor to check ownership
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${slotId} not found.`);
    }

    // 3. Authorization Check: Ensure the doctor owns this time slot
    if (timeSlot.doctor.doctor_id !== doctor.doctor_id) {
      throw new ForbiddenException(
        'You are not authorized to delete this time slot.',
      );
    }

    // 4. Validation Check: Check if any appointments exist in this session
    const appointmentsInSession = await this.checkAppointmentsInSession(
      doctor.doctor_id,
      timeSlot.slot_date,
      timeSlot.session,
    );

    if (appointmentsInSession) {
      throw new ConflictException(
        'You cannot modify this slot because an appointment is already booked in this session.',
      );
    }

    // 5. If all checks pass, delete the slot
    await this.slotRepo.remove(timeSlot);

    return { message: `Time slot ${slotId} has been successfully deleted.` };
  }

  async updateTimeSlot(
    user_id: number,
    doctorId: number,
    slotId: number,
    dto: UpdateTimeSlotDto,
  ) {
    // 1. Find the doctor making the request
    const doctor = await this.doctorRepo.findOne({
      where: { user: { user_id: user_id } },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found.');
    }

    // 2. Verify doctor ID matches
    if (doctor.doctor_id !== doctorId) {
      throw new ForbiddenException(
        'You are not authorized to access this doctor profile.',
      );
    }

    // 2. Find the time slot to be edited
    const timeSlot = await this.slotRepo.findOne({
      where: { slot_id: slotId },
      relations: ['doctor'],
    });
    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${slotId} not found.`);
    }

    // 3. Authorization Check
    if (timeSlot.doctor.doctor_id !== doctor.doctor_id) {
      throw new ForbiddenException(
        'You are not authorized to edit this time slot.',
      );
    }

    // 4. Validation Check: Check if any appointments exist in this session
    const appointmentsInSession = await this.checkAppointmentsInSession(
      doctor.doctor_id,
      timeSlot.slot_date,
      timeSlot.session,
    );

    if (appointmentsInSession) {
      throw new ConflictException(
        'You cannot modify this slot because an appointment is already booked in this session.',
      );
    }

    // 5. Update the slot and save
    Object.assign(timeSlot, dto); // Merge new start/end times
    const updatedSlot = await this.slotRepo.save(timeSlot);

    return {
      message: `Time slot ${slotId} has been successfully updated.`,
      slot: updatedSlot,
    };
  }

  async createManualSlot(doctorId: number, dto: CreateManualSlotDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    // Validate date is not in the past
    const today = dayjs().startOf('day');
    const requestedDate = dayjs(dto.date);
    if (requestedDate.isBefore(today)) {
      throw new BadRequestException('Cannot create slot for a past date');
    }

    // Check if slot already exists
    const existingSlot = await this.slotRepo.findOne({
      where: {
        doctor: { doctor_id: doctorId },
        slot_date: new Date(dto.date),
        slot_time: dto.start_time,
      },
    });

    if (existingSlot) {
      throw new ConflictException('Slot already exists for this time');
    }

    // Calculate slot duration
    const start = dayjs(`${dto.date}T${dto.start_time}`);
    const end = dayjs(`${dto.date}T${dto.end_time}`);
    const slotDuration = end.diff(start, 'minute');

    // Create the slot
    const slot = this.slotRepo.create({
      doctor,
      slot_date: dto.date,
      slot_time: dto.start_time,
      is_available: true,
      session: dto.session,
      booked_count: 0,
    });

    await this.slotRepo.save(slot);

    // Update doctor's slot settings
    doctor.slot_duration = slotDuration;
    doctor.patients_per_slot = dto.patients_per_slot;
    await this.doctorRepo.save(doctor);

    return {
      message: 'Manual slot created successfully',
      slot_duration: slotDuration,
      patients_per_slot: dto.patients_per_slot,
    };
  }

  async setBookingWindow(doctorId: number, dto: SetBookingWindowDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    // Validate that start time is before end time
    const startTime = dayjs(`2000-01-01T${dto.booking_start_time}`);
    const endTime = dayjs(`2000-01-01T${dto.booking_end_time}`);

    if (startTime.isAfter(endTime)) {
      throw new BadRequestException(
        'Booking start time must be before end time',
      );
    }

    doctor.booking_start_time = dto.booking_start_time;
    doctor.booking_end_time = dto.booking_end_time;

    await this.doctorRepo.save(doctor);

    return {
      message: 'Booking window updated successfully',
      booking_start_time: dto.booking_start_time,
      booking_end_time: dto.booking_end_time,
    };
  }

  // Helper method to check appointments in session
  private async checkAppointmentsInSession(
    doctorId: number,
    date: Date,
    session: string,
  ): Promise<boolean> {
    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        appointment_date: date,
      },
      relations: ['doctor'],
    });

    // Check if any appointment exists in the same session
    for (const appointment of appointments) {
      const appointmentSlot = await this.slotRepo.findOne({
        where: {
          doctor: { doctor_id: doctorId },
          slot_date: date,
          slot_time: appointment.time_slot,
        },
      });

      if (appointmentSlot?.session === session) {
        return true;
      }
    }

    return false;
  }

  async getDoctorAppointments(
    userId: number,
    doctorId: number,
    options: {
      status?: 'scheduled' | 'completed' | 'cancelled';
      date?: string;
      page: number;
      limit: number;
    },
  ) {
    // Validate doctor ownership
    await this.validateDoctorOwnership(userId, doctorId);

    const { status, date, page, limit } = options;
    const queryBuilder = this.appointmentRepo.createQueryBuilder('appointment');

    queryBuilder
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('doctor.doctor_id = :doctorId', { doctorId });

    if (status) {
      queryBuilder.andWhere('appointment.appointment_status = :status', {
        status,
      });
    }

    if (date) {
      queryBuilder.andWhere('DATE(appointment.appointment_date) = :date', {
        date,
      });
    }

    // Add pagination
    queryBuilder
      .orderBy('appointment.appointment_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [appointments, total] = await queryBuilder.getManyAndCount();

    // Transform appointments to include status field for API consistency
    const transformedAppointments = appointments.map((appointment) => ({
      ...appointment,
      status: appointment.appointment_status,
    }));

    return {
      appointments: transformedAppointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async validateDoctorOwnership(userId: number, doctorId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.user.user_id !== userId) {
      throw new ForbiddenException('You can only access your own appointments');
    }

    return doctor;
  }

  async updateAppointmentStatus(
    userId: number,
    doctorId: number,
    appointmentId: number,
    dto: { status: 'completed' | 'cancelled' | 'no-show'; reason?: string },
  ) {
    // Validate doctor ownership
    await this.validateDoctorOwnership(userId, doctorId);

    const appointment = await this.appointmentRepo.findOne({
      where: {
        appointment_id: appointmentId,
        doctor: { doctor_id: doctorId },
      },
      relations: ['doctor'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment can be updated
    if (
      appointment.appointment_status === 'completed' ||
      appointment.appointment_status === 'cancelled'
    ) {
      throw new BadRequestException(
        'Cannot update status of completed or cancelled appointment',
      );
    }

    appointment.appointment_status = dto.status;

    // If cancelling or marking as no-show, make the slot available again
    if (dto.status === 'cancelled' || dto.status === 'no-show') {
      const slot = await this.slotRepo.findOne({
        where: {
          doctor: { doctor_id: doctorId },
          slot_date: appointment.appointment_date,
          slot_time: appointment.time_slot,
        },
      });

      if (slot) {
        slot.is_available = true;
        await this.slotRepo.save(slot);
      }
    }

    const savedAppointment = await this.appointmentRepo.save(appointment);

    // Return appointment with status field for API consistency
    return {
      ...savedAppointment,
      status: savedAppointment.appointment_status,
    };
  }

  async checkSlotAvailability(doctorId: number, slotId: number) {
    const slot = await this.slotRepo.findOne({
      where: {
        slot_id: slotId,
        doctor: { doctor_id: doctorId },
      },
      relations: ['doctor'],
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Check if slot is in the past
    const now = dayjs();
    const slotDateTime = dayjs(`${slot.slot_date} ${slot.slot_time}`);
    const isPast = slotDateTime.isBefore(now);

    // Check for existing appointments
    const existingAppointments = await this.appointmentRepo.count({
      where: {
        doctor: { doctor_id: doctorId },
        appointment_date: slot.slot_date,
        time_slot: slot.slot_time,
        appointment_status: 'scheduled',
      },
    });

    return {
      slotId,
      doctorId,
      date: slot.slot_date,
      time: slot.slot_time,
      isAvailable: slot.is_available && !isPast,
      isPast,
      existingAppointments,
      maxCapacity: slot.doctor.patients_per_slot || 1,
      canBook:
        slot.is_available &&
        !isPast &&
        existingAppointments < (slot.doctor.patients_per_slot || 1),
    };
  }

  async rescheduleAppointment(
    userId: number,
    doctorId: number,
    appointmentId: number,
    newSlotId: number,
    reason?: string,
  ) {
    // Validate doctor ownership
    await this.validateDoctorOwnership(userId, doctorId);

    const appointment = await this.appointmentRepo.findOne({
      where: {
        appointment_id: appointmentId,
        doctor: { doctor_id: doctorId },
      },
      relations: ['doctor'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.appointment_status !== 'scheduled') {
      throw new BadRequestException(
        'Only scheduled appointments can be rescheduled',
      );
    }

    // Check if new slot is available
    const newSlot = await this.slotRepo.findOne({
      where: {
        slot_id: newSlotId,
        doctor: { doctor_id: doctorId },
      },
      relations: ['doctor'],
    });

    if (!newSlot) {
      throw new NotFoundException('New slot not found');
    }

    if (!newSlot.is_available) {
      throw new BadRequestException('New slot is not available');
    }

    // Check if new slot is in the future
    const now = dayjs();
    const newSlotDateTime = dayjs(`${newSlot.slot_date} ${newSlot.slot_time}`);
    if (newSlotDateTime.isBefore(now)) {
      throw new BadRequestException('Cannot reschedule to a past slot');
    }

    // Free up the old slot
    const oldSlot = await this.slotRepo.findOne({
      where: {
        doctor: { doctor_id: doctorId },
        slot_date: appointment.appointment_date,
        slot_time: appointment.time_slot,
      },
    });

    if (oldSlot) {
      oldSlot.is_available = true;
      await this.slotRepo.save(oldSlot);
    }

    // Update appointment with new slot details
    appointment.appointment_date = newSlot.slot_date;
    appointment.time_slot = newSlot.slot_time;

    // Mark new slot as unavailable
    newSlot.is_available = false;
    await this.slotRepo.save(newSlot);

    const savedAppointment = await this.appointmentRepo.save(appointment);

    // Return appointment with status field for API consistency
    return {
      ...savedAppointment,
      status: savedAppointment.appointment_status,
    };
  }

  async deleteExistingSlots(doctorId: number, date: string) {
    await this.slotRepo.delete({
      doctor: { doctor_id: doctorId },
      slot_date: new Date(date),
    });
  }

  async getAllSlots(
    doctorId: number,
    options: {
      page: number;
      limit: number;
      date?: string;
      availableOnly?: boolean;
    },
  ) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const today = dayjs().startOf('day').toDate();

    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
      slot_date: MoreThanOrEqual(today),
    };

    if (options.availableOnly) {
      whereConditions.is_available = true;
    }

    if (options.date) {
      whereConditions.slot_date = new Date(options.date);
    }

    const [slots, total] = await this.slotRepo.findAndCount({
      where: whereConditions,
      relations: ['availability'],
      order: {
        slot_date: 'ASC',
        slot_time: 'ASC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return {
      doctor_id: doctorId,
      total_slots: total,
      page: options.page,
      limit: options.limit,
      slots: slots.map((slot) => ({
        slot_id: slot.slot_id,
        slot_date: slot.slot_date,
        slot_time: slot.slot_time,
        session: slot.session,
        is_available: slot.is_available,
        booked_count: slot.booked_count,
        availability_id: slot.availability?.id,
      })),
    };
  }
}
