import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './resource.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourcesRepository: Repository<Resource>,
  ) {}

  findAll(): Promise<Resource[]> {
    return this.resourcesRepository.find();
  }

  create(name: string, timezone: string): Promise<Resource> {
    const resource = this.resourcesRepository.create({ name, timezone });
    return this.resourcesRepository.save(resource);
  }
}
