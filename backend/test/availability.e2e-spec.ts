import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Availability API (e2e)', () => {
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

  describe('GET /resources', () => {
    it('should return a list of resources', async () => {
      const response = await request(app.getHttpServer())
        .get('/resources')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('timezone');
      }
    });
  });

  describe('GET /resources/:resourceId/availability', () => {
    const invalidId = '00000000-0000-0000-0000-000000000000';

    it('should return 400 if date is missing or invalid format', async () => {
      // Missing date
      await request(app.getHttpServer())
        .get(`/resources/${invalidId}/availability?timezone=Asia/Kolkata`)
        .expect(400);

      // Invalid date format
      await request(app.getHttpServer())
        .get(`/resources/${invalidId}/availability?date=10-10-2023&timezone=Asia/Kolkata`)
        .expect(400);
    });

    it('should return 400 if timezone is missing or invalid', async () => {
      await request(app.getHttpServer())
        .get(`/resources/${invalidId}/availability?date=2023-10-10`)
        .expect(400);

      await request(app.getHttpServer())
        .get(`/resources/${invalidId}/availability?date=2023-10-10&timezone=Mars/City`)
        .expect(400);
    });

    it('should return 404 if resource does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get(`/resources/${invalidId}/availability?date=2023-10-10&timezone=Asia/Kolkata`)
        .expect(404);

      expect(response.body.message).toBe('Resource not found');
    });

    it('should return valid availability structure for an existing resource', async () => {
      // First, get an actual resource ID from GET /resources
      const resResponse = await request(app.getHttpServer()).get('/resources');
      const resources = resResponse.body;
      
      // If the db has resources (which it does via seed), pick the first one
      if (resources.length > 0) {
        const resourceId = resources[0].id;

        // Choose a Monday (e.g., 2023-10-09) where we seeded availability
        const availabilityResponse = await request(app.getHttpServer())
          .get(`/resources/${resourceId}/availability?date=2023-10-09&timezone=Asia/Kolkata`)
          .expect(200);

        const body = availabilityResponse.body;

        expect(body).toHaveProperty('resource');
        expect(body.resource.id).toBe(resourceId);
        expect(body).toHaveProperty('date', '2023-10-09');
        expect(body).toHaveProperty('displayTimezone', 'Asia/Kolkata');
        expect(body).toHaveProperty('slots');
        expect(Array.isArray(body.slots)).toBe(true);

        if (body.slots.length > 0) {
          const slot = body.slots[0];
          expect(slot).toHaveProperty('start');
          expect(slot).toHaveProperty('end');
          expect(slot).toHaveProperty('displayStart');
          expect(slot).toHaveProperty('displayEnd');
          expect(slot).toHaveProperty('available');
        }
      }
    });
  });
});
