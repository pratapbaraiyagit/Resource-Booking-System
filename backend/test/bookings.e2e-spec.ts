import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Bookings API (e2e)', () => {
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
      // Fetch availability for a specific Monday to get valid UTC bounds
      const availResponse = await request(app.getHttpServer())
        .get(`/resources/${resourceId}/availability?date=2023-10-09&timezone=UTC`);
      
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

  it('7. Invalid request (Missing Fields)', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({})
      .expect(400);
  });

  it('6. Resource not found', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId: '00000000-0000-0000-0000-000000000000',
        userId: 'demo',
        startTime: '2023-10-09T09:00:00Z',
        endTime: '2023-10-09T09:30:00Z',
      })
      .expect(404);
  });

  it('3. Wrong duration fails', async () => {
    // 45 minutes duration
    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'demo',
        startTime: '2023-10-09T09:00:00Z',
        endTime: '2023-10-09T09:45:00Z',
      })
      .expect(400);

    // Negative duration
    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'demo',
        startTime: '2023-10-09T09:30:00Z',
        endTime: '2023-10-09T09:00:00Z',
      })
      .expect(400);
  });

  it('2. Booking outside availability fails', async () => {
    // 03:00 UTC is usually outside working hours (if London 09-17)
    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'demo',
        startTime: '2023-10-09T03:00:00.000Z',
        endTime: '2023-10-09T03:30:00.000Z',
      })
      .expect(400);
  });

  it('1. Valid booking succeeds', async () => {
    if (!validStartUtc) return; // Skip if db not seeded
    
    const res = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'demo-user-1',
        startTime: validStartUtc,
        endTime: validEndUtc,
      });
      
    if (res.status !== 201) console.error(res.body);
    expect(res.status).toBe(201);
  });

  it('4. Overlapping booking returns 409', async () => {
    if (!validStartUtc) return; // Skip if db not seeded
    
    // Attempt the exact same booking again
    const res = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'demo-user-2',
        startTime: validStartUtc,
        endTime: validEndUtc,
      })
      .expect(409);

    expect(res.body.message).toBe('This slot has already been booked.');
  });

  it('5. Adjacent booking succeeds', async () => {
    // Fetch a fresh set of slots to get the second slot
    const availResponse = await request(app.getHttpServer())
      .get(`/resources/${resourceId}/availability?date=2023-10-09&timezone=UTC`);
    
    const secondSlot = availResponse.body.slots[1]; // The slot immediately after the first

    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId,
        userId: 'demo-user-3',
        startTime: secondSlot.start,
        endTime: secondSlot.end,
      })
      .expect(201);
  });
});
