import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { addMinutes, startOfTomorrow, set } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

describe('Concurrent Bookings (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should prevent overlapping bookings concurrently', async () => {
    // 1. Create a Resource
    const resourceRes = await request(app.getHttpServer())
      .post('/resources')
      .send({ name: 'Concurrent Test Room', description: 'Testing GiST' })
      .expect(201);
    
    const resourceId = resourceRes.body.id;

    // 2. Create Availability for tomorrow
    const tomorrow = startOfTomorrow();
    const dayOfWeek = tomorrow.getDay();
    
    await request(app.getHttpServer())
      .post(`/resources/${resourceId}/availability`)
      .send({
        dayOfWeek,
        startTime: '09:00:00',
        endTime: '17:00:00'
      })
      .expect(201);

    // 3. Prepare the exact same time slot for concurrent booking
    const slotStart = set(tomorrow, { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 });
    const slotEnd = addMinutes(slotStart, 30);

    const slotStartIso = slotStart.toISOString();
    const slotEndIso = slotEnd.toISOString();

    // 4. Fire 10 concurrent requests
    const promises = [];
    const numRequests = 10;
    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/bookings')
          .send({
            resourceId,
            userId: `user-${i}`,
            startTime: slotStartIso,
            endTime: slotEndIso
          })
      );
    }

    const responses = await Promise.all(promises);

    // 5. Assertions
    const successfulResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);

    // Exactly one should succeed
    expect(successfulResponses.length).toBe(1);
    // The rest should fail with 409 Conflict
    expect(conflictResponses.length).toBe(numRequests - 1);
  });
});
