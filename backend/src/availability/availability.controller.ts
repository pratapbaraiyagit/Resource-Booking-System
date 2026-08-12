import { Controller } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('resources')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}
  
  // API endpoints will be implemented here later
}
