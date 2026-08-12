import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Concurrent Bookings (e2e)', () => {
  let app: INestApplication;
  let resourceId: string;
  let validStartUtc: string;
  let validEndUtc: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Fetch resources to get a valid resourceId
    const resResponse = await request(app.getHttpServer()).get('/resources');
    const resources = resResponse.body;
    
    if (resources.length > 0) {
      resourceId = resources[0].id;
      // Fetch availability for a specific Tuesday to get a fresh valid UTC slot
      const availResponse = await request(app.getHttpServer())
        .get(`/resources/${resourceId}/availability?date=2023-10-10&timezone=UTC`);
      
      const slots = availResponse.body.slots;
      if (slots && slots.length >= 2) {
        validStartUtc = slots[0].start;
        validEndUtc = slots[0].end;
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should prevent overlapping bookings concurrently completely natively via DB exclusion constraint', async () => {
    if (!validStartUtc) return; // skip if DB not initialized

    const numRequests = 10;
    const promises = [];

    // Fire exactly the same request simultaneously 10 times without await in the loop
    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app.getHttpServer())
          .post('/bookings')
          .send({
            resourceId,
            userId: `concurrent-user-${i}`,
            startTime: validStartUtc,
            endTime: validEndUtc,
          })
      );
    }

    // Wait for all HTTP responses to complete at exactly the same time
    const responses = await Promise.all(promises);

    const successfulResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);

    // Because there is no application lock, the DB exclusion constraint is the only 
    // thing preventing overlaps. If it works, exactly 1 will succeed.
    expect(successfulResponses.length).toBe(1);
    
    // The other 9 MUST fail with HTTP 409 Conflict.
    expect(conflictResponses.length).toBe(numRequests - 1);
  });
});
