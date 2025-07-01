import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateAppointmentDto } from 'src/dto/create_appointment.dto';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('/api/v1')
export class AppointmentsController {
  constructor(private appointmentService: AppointmentsService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('patient')
  @Post('/appointments')
  bookAppointment(@Body() dto: CreateAppointmentDto, @Req() req) {
    return this.appointmentService.bookAppointment(dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/view-appointments')
  async viewAppointments(@Req() req) {
    return this.appointmentService.view_appointments(req.user);
  }
}
