import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  DefaultValuePipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateAvailabilityDto } from 'src/dto/availablity.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateTimeSlotDto } from 'src/dto/update_time_slot.dto';
import { CreateManualSlotDto } from 'src/dto/manual_slot.dto';
import { SetBookingWindowDto } from 'src/dto/booking_window.dto';
import { UpdateAppointmentStatusDto } from 'src/dto/appointment_status.dto';
import {
  CheckSlotConflictDto,
  BulkDeleteSlotsDto,
} from 'src/dto/slot_operations.dto';

@Controller('api/v1/doctors')
export class DoctorController {
  constructor(private doctorService: DoctorService) {}
  @UseGuards(JwtAuthGuard)
  @Get()
  getDoctors(
    @Query('name') name?: string,
    @Query('specialization') specialization?: string,
  ) {
    return this.doctorService.getDoctors(name, specialization);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getDoctorByID(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.getDoctorByID(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Post(':id/availability')
  async createAvailability(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: CreateAvailabilityDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.createAvailability(doctorId, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id/availability')
  async getAvailability(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('date') date?: string,
    @Query('timeSlot') timeSlot?: 'morning' | 'afternoon' | 'evening',
  ) {
    const validatedLimit = Math.min(+limit, 50); // Limit max results to 50
    return this.doctorService.getAvailableSlots(
      doctorId,
      +page,
      validatedLimit,
    );
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/schedule_type')
  async set_Scheduling_type(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body('schedule_type') schedule_type: 'stream' | 'wave',
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.setScheduleType(doctorId, schedule_type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Post(':id/manual-slot')
  async createManualSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: CreateManualSlotDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.createManualSlot(doctorId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/booking-window')
  async setBookingWindow(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: SetBookingWindowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.setBookingWindow(doctorId, dto);
  }

  @Delete(':id/time-slots/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async deleteTimeSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.deleteTimeSlot(userId, doctorId, slotId);
  }

  @Patch(':id/time-slots/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async updateTimeSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.updateTimeSlot(
      userId,
      doctorId,
      slotId,
      updateTimeSlotDto,
    );
  }

  // New endpoints for better appointment management
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Get(':id/appointments')
  async getDoctorAppointments(
    @Param('id', ParseIntPipe) doctorId: number,
    @Req() req: any,
    @Query('status') status?: 'scheduled' | 'completed' | 'cancelled',
    @Query('date') date?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const userId = req.user.sub;
    const validatedLimit = Math.min(+limit, 50);
    return this.doctorService.getDoctorAppointments(userId, doctorId, {
      status,
      date,
      page: +page,
      limit: validatedLimit,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/appointments/:appointmentId/status')
  async updateAppointmentStatus(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.doctorService.updateAppointmentStatus(
      userId,
      doctorId,
      appointmentId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/slots/:slotId/availability')
  async checkSlotAvailability(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
  ) {
    return this.doctorService.checkSlotAvailability(doctorId, slotId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/appointments/:appointmentId/reschedule')
  async rescheduleAppointment(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body('newSlotId') newSlotId: number,
    @Req() req: any,
    @Body('reason') reason?: string,
  ) {
    const userId = req.user.sub;
    return this.doctorService.rescheduleAppointment(
      userId,
      doctorId,
      appointmentId,
      newSlotId,
      reason,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Delete(':id/slots/:date')
  async deleteExistingSlots(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('date') date: string,
    @Req() req: any,
  ) {
    // Check if user is the doctor
    const userDoctorId = req.user.doctorId;
    if (userDoctorId !== doctorId) {
      throw new ForbiddenException('You can only delete your own slots');
    }

    await this.doctorService.deleteExistingSlots(doctorId, date);
    return { message: `Deleted all slots for doctor ${doctorId} on ${date}` };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/slots')
  async getAllSlots(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('date') date?: string,
    @Query('available_only') availableOnly: boolean = true,
  ) {
    const validatedLimit = Math.min(+limit, 100);
    return this.doctorService.getAllSlots(doctorId, {
      page: +page,
      limit: validatedLimit,
      date,
      availableOnly,
    });
  }
}
