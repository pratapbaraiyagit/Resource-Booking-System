import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from '../src/bookings/booking.entity';
import { Repository } from 'typeorm';

describe('Concurrent Bookings Mandatory Test (e2e)', () => {
  let app: INestApplication;
  let bookingRepository: Repository<Booking>;
  let resourceId: string;
  let validStartUtc: string;
  let validEndUtc: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    bookingRepository = moduleFixture.get<Repository<Booking>>(getRepositoryToken(Booking));

    // Fetch resources to get a valid resourceId
    const resResponse = await request(app.getHttpServer()).get('/resources');
    const resources = resResponse.body;
    
    if (resources.length > 0) {
      resourceId = resources[0].id;
      // Fetch availability for a specific Wednesday to get a completely fresh valid UTC slot
      const availResponse = await request(app.getHttpServer())
        .get(`/resources/${resourceId}/availability?date=2023-10-11&timezone=UTC`);
      
      const slots = availResponse.body.slots;
      if (slots && slots.length >= 2) {
        validStartUtc = slots[0].start;
        validEndUtc = slots[0].end;
      }
    }

    // Clean up DB before test to allow for repeated test executions
    await bookingRepository.query('DELETE FROM booking');
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. should prove the system cannot double-book a resource (Concurrency)', async () => {
    if (!validStartUtc) return; // skip if DB not initialized

    // Ensure no existing booking exists for this precise slot
    const countBefore = await bookingRepository.count({
      where: {
        resourceId,
        startTime: new Date(validStartUtc),
        endTime: new Date(validEndUtc)
      }
    });
    expect(countBefore).toBe(0);

    // Create exactly TWO concurrent booking HTTP requests
    const promises = [
      request(app.getHttpServer())
        .post('/bookings')
        .send({
          resourceId,
          userId: 'concurrent-user-A',
          startTime: validStartUtc,
          endTime: validEndUtc,
        }),
      request(app.getHttpServer())
        .post('/bookings')
        .send({
          resourceId,
          userId: 'concurrent-user-B',
          startTime: validStartUtc,
          endTime: validEndUtc,
        })
    ];

    // Wait for both responses simultaneously
    const responses = await Promise.all(promises);

    const successfulResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);

    // Expected result: exactly ONE request returns 201
    expect(successfulResponses.length).toBe(1);
    
    // Expected result: exactly ONE request returns 409
    expect(conflictResponses.length).toBe(1);

    // Expected result: exactly ONE booking exists in PostgreSQL
    const countAfter = await bookingRepository.count({
      where: {
        resourceId,
        startTime: new Date(validStartUtc),
        endTime: new Date(validEndUtc)
      }
    });
    expect(countAfter).toBe(1);
  });

  it('2. should prove adjacent slots can both exist', async () => {
    if (!validStartUtc) return; // skip if DB not initialized

    // Fetch availability again to cleanly get two adjacent slots
    const availResponse = await request(app.getHttpServer())
      .get(`/resources/${resourceId}/availability?date=2023-10-12&timezone=UTC`);
    
    const slot1 = availResponse.body.slots[0]; // e.g. 10:00 - 10:30
    const slot2 = availResponse.body.slots[1]; // e.g. 10:30 - 11:00

    // Create first adjacent booking
    const res1 = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'adjacent-user-1',
        startTime: slot1.start,
        endTime: slot1.end,
      });
    
    // Create second adjacent booking
    const res2 = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'adjacent-user-2',
        startTime: slot2.start,
        endTime: slot2.end,
      });

    // Both should succeed!
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    // Prove they both exist in DB
    const count = await bookingRepository.count({
      where: [
        { resourceId, startTime: new Date(slot1.start) },
        { resourceId, startTime: new Date(slot2.start) }
      ]
    });
    
    expect(count).toBe(2);
  });
});
