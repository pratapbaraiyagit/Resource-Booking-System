import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';

@Controller('resources')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}
  
  @Get(':resourceId/availability')
  @UsePipes(new ValidationPipe({ transform: true }))
  getAvailability(
    @Param('resourceId') resourceId: string,
    @Query() query: GetAvailabilityDto,
  ) {
    return this.availabilityService.getAvailability(resourceId, query.date, query.timezone);
  }
}
