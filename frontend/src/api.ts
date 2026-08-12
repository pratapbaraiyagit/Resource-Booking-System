import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export interface Resource {
  id: string;
  name: string;
  timezone: string;
}

export interface Slot {
  start: string;
  end: string;
  displayStart: string;
  displayEnd: string;
  available: boolean;
}

export interface AvailabilityResponse {
  resource: Resource;
  date: string;
  displayTimezone: string;
  slots: Slot[];
}

export const getResources = async (): Promise<Resource[]> => {
  const response = await api.get('/resources');
  return response.data;
};

export const getAvailability = async (resourceId: string, date: string, timezone: string): Promise<AvailabilityResponse> => {
  const response = await api.get(`/resources/${resourceId}/availability?date=${date}&timezone=${encodeURIComponent(timezone)}`);
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
