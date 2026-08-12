import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResourcesModule } from './resources/resources.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { Resource } from './resources/resource.entity';
import { Availability } from './availability/availability.entity';
import { Booking } from './bookings/booking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST') || 'localhost',
        port: configService.get<number>('POSTGRES_PORT') || 5432,
        username: configService.get<string>('POSTGRES_USER') || 'pratapbaraiya',
        password: configService.get<string>('POSTGRES_PASSWORD') || '',
        database: configService.get<string>('POSTGRES_DB') || 'rbs_db',
        entities: [Resource, Availability, Booking],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ResourcesModule,
    AvailabilityModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
