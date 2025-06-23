import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DoctorService } from './doctor.service';

@Controller('api/v1/doctors')
export class DoctorController {
  constructor(private doctorService: DoctorService) {}

  @Get()
  getDoctors(
    @Query('name') name?: string,
    @Query('specialization') specialization?: string,
  ) {
    return this.doctorService.getDoctors(name, specialization);
  }

  @Get(':id')
  getDoctorByID(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.getDoctorByID(id);
  }
}
