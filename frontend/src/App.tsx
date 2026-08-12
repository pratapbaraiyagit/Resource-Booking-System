import { useEffect, useState } from 'react';
import { getResources, getAvailability, createBooking, type Resource, type Slot } from './api';
import './index.css';

const COMMON_TIMEZONES = [
  Intl.DateTimeFormat().resolvedOptions().timeZone,
  'UTC',
  'Europe/London',
  'America/New_York',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/Los_Angeles'
];

// Deduplicate just in case local tz is one of the hardcoded ones
const TIMEZONES = Array.from(new Set(COMMON_TIMEZONES));

function App() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('');
  
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    setFeedback(null);
    if (selectedResource && selectedDate && selectedTimezone) {
      fetchAvailability();
    } else {
      setSlots([]);
    }
  }, [selectedResource, selectedDate, selectedTimezone]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const fetchResources = async () => {
    try {
      const data = await getResources();
      setResources(data);
      if (data.length > 0 && !selectedResource) {
        setSelectedResource(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load resources', err);
    }
  };

  const fetchAvailability = async () => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getAvailability(selectedResource, selectedDate, selectedTimezone);
      setSlots(res.slots);
    } catch (err) {
      console.error('Failed to load availability', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!selectedResource || !selectedSlot) return;

    setBookingLoading(true);
    setFeedback(null);

    try {
      await createBooking(
        selectedResource,
        'demo-user', // Hardcoded user ID as per requirements
        selectedSlot.start,
        selectedSlot.end
      );
      
      setFeedback({ type: 'success', message: 'Booking confirmed.' });
      
      // Refresh availability to reflect the new booking
      await fetchAvailability();
      
    } catch (error: any) {
      if (error.response?.status === 409) {
        setFeedback({ 
          type: 'error', 
          message: 'This slot was just booked by someone else. Please select another slot.' 
        });
      } else {
        setFeedback({ 
          type: 'error', 
          message: 'An unexpected error occurred while booking.' 
        });
      }
      
      // Refresh availability to update the grid with the taken slot
      await fetchAvailability();
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="header">
          <h1>Resource Booking</h1>
          <p>Select a resource and time to book</p>
        </div>

        <div className="form-group">
          <label>Resource</label>
          <select 
            value={selectedResource} 
            onChange={(e) => setSelectedResource(e.target.value)}
          >
            <option value="" disabled>Select a resource...</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name} (Base TZ: {r.timezone})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Your Timezone</label>
          <select 
            value={selectedTimezone} 
            onChange={(e) => setSelectedTimezone(e.target.value)}
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>
            Viewing times in:
          </h3>
          <p style={{ color: 'var(--accent)', fontWeight: 500, marginBottom: '1.5rem' }}>
            {selectedTimezone}
          </p>

          {loadingSlots ? (
            <div className="loader"></div>
          ) : slots.length === 0 && selectedResource ? (
            <div className="empty-state">No availability found for this date.</div>
          ) : (
            <div className="slots-grid">
              {slots.map((slot, index) => {
                const isSelected = selectedSlot?.start === slot.start;
                
                return (
                  <button
                    key={index}
                    className={`slot-btn ${isSelected ? 'selected' : ''}`}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {slot.displayStart} - {slot.displayEnd}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                      {slot.available ? 'Available' : 'Booked'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button 
          className="btn-primary" 
          disabled={!selectedSlot || bookingLoading}
          onClick={handleBook}
        >
          {bookingLoading ? 'Booking...' : (selectedSlot ? 'Book Selected Slot' : 'Select a Slot')}
        </button>
      </div>

      {feedback && (
        <div className={`toast ${feedback.type === 'error' ? 'error' : ''}`}>
          {feedback.message}
        </div>
      )}
    </>
  );
}

export default App;
