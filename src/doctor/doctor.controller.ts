import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateAvailabilityDto } from 'src/dto/availablity.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateTimeSlotDto } from 'src/dto/update_time_slot.dto';
import { CreateManualSlotDto } from 'src/dto/manual_slot.dto';
import { SetBookingWindowDto } from 'src/dto/booking_window.dto';

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
    @Param('id') doctorId: number,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.doctorService.createAvailability(doctorId, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id/availability')
  async getAvailability(
    @Param('id') doctorId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.doctorService.getAvailableSlots(doctorId, +page, +limit);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/schedule_type')
  async set_Scheduling_type(
    @Param('id') doctorId: number,
    @Body('schedule_type') schedule_type: 'stream' | 'wave',
  ) {
    return this.doctorService.setScheduleType(doctorId, schedule_type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Post(':id/manual-slot')
  async createManualSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: CreateManualSlotDto,
  ) {
    return this.doctorService.createManualSlot(doctorId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Patch(':id/booking-window')
  async setBookingWindow(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: SetBookingWindowDto,
  ) {
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
}
