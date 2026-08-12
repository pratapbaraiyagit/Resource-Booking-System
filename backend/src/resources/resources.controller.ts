import { Controller, Get, Post, Body } from '@nestjs/common';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll() {
    return this.resourcesService.findAll();
  }

  @Post()
  create(@Body() createResourceDto: { name: string; timezone: string }) {
    return this.resourcesService.create(createResourceDto.name, createResourceDto.timezone);
  }
}
