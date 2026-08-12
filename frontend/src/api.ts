import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export interface Resource {
  id: string;
  name: string;
  description: string;
}

export interface Slot {
  start: string;
  end: string;
}

export const getResources = async (): Promise<Resource[]> => {
  const response = await api.get('/resources');
  return response.data;
};

export const getAvailableSlots = async (resourceId: string, date: string): Promise<Slot[]> => {
  const response = await api.get(`/resources/${resourceId}/slots?date=${date}`);
  return response.data;
};

export const createBooking = async (
  resourceId: string,
  userId: string,
  startTime: string,
  endTime: string
) => {
  const response = await api.post('/bookings', {
    resourceId,
    userId,
    startTime,
    endTime,
  });
  return response.data;
};

// Seed utility to create dummy data if needed
export const seedDatabase = async () => {
  const resource = await api.post('/resources', {
    name: 'Conference Room A',
    description: 'Main conference room',
  });
  const resourceId = resource.data.id;
  
  // Seed availability for every day of the week
  for (let i = 0; i <= 6; i++) {
    await api.post(`/resources/${resourceId}/availability`, {
      dayOfWeek: i,
      startTime: '09:00:00',
      endTime: '17:00:00',
    });
  }
  return true;
};
