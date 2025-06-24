import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateAvailabilityDto } from 'src/dto/availablity.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('api/v1/doctors')
export class DoctorController {
  constructor(private doctorService: DoctorService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Get()
  getDoctors(
    @Query('name') name?: string,
    @Query('specialization') specialization?: string,
  ) {
    return this.doctorService.getDoctors(name, specialization);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Get(':id/availability')
  async getAvailability(@Param('id') doctorId: number) {
    return this.doctorService.getAvailableSlots(doctorId);
  }
}
