const axios = require('axios');
const assert = require('assert');

const API = 'http://localhost:3000';
let resources = [];
let londonResource = null;
let newYorkResource = null;

async function runQA() {
  console.log('--- Starting QA Test Flow ---');

  // 6. Select a resource
  const resReq = await axios.get(`${API}/resources`);
  resources = resReq.data;
  assert(resources.length > 0, 'No resources found (Seed failed?)');
  console.log('✅ Resources loaded:', resources.length);

  londonResource = resources.find(r => r.timezone === 'Europe/London');
  newYorkResource = resources.find(r => r.timezone === 'America/New_York');

  // 7-9. Select a date, Asia/Kolkata, verify slots
  const date = '2023-11-15'; // Wednesday
  const tz = 'Asia/Kolkata';
  
  const availReq = await axios.get(`${API}/resources/${londonResource.id}/availability?date=${date}&timezone=${tz}`);
  const slots = availReq.data.slots;
  assert(slots.length > 0, 'No slots generated');
  console.log('✅ Slots displayed in Asia/Kolkata:', slots.length);

  // 10. Book a valid slot
  const slotToBook = slots.find(s => s.available);
  assert(slotToBook, 'No available slots');
  
  const bookReq = await axios.post(`${API}/bookings`, {
    resourceId: londonResource.id,
    userId: 'qa-user-1',
    startTime: slotToBook.start,
    endTime: slotToBook.end
  });
  assert(bookReq.status === 201, 'Booking failed');
  console.log('✅ Booked a valid slot');

  // 11. Verify it becomes unavailable
  const availReq2 = await axios.get(`${API}/resources/${londonResource.id}/availability?date=${date}&timezone=${tz}`);
  const updatedSlot = availReq2.data.slots.find(s => s.start === slotToBook.start);
  assert(updatedSlot.available === false, 'Slot did not become unavailable');
  console.log('✅ Verified slot became unavailable');

  // 12-13. Try booking it again (Verify 409)
  try {
    await axios.post(`${API}/bookings`, {
      resourceId: londonResource.id,
      userId: 'qa-user-2',
      startTime: slotToBook.start,
      endTime: slotToBook.end
    });
    assert.fail('Duplicate booking should have failed');
  } catch (err) {
    assert(err.response?.status === 409, `Expected 409, got ${err.response?.status}`);
    console.log('✅ Verified 409 Conflict behavior for duplicate booking');
  }

  // 14. Verify adjacent slot can still be booked
  const adjacentSlot = availReq2.data.slots.find(s => s.available && new Date(s.start).getTime() >= new Date(slotToBook.end).getTime());
  assert(adjacentSlot, 'No adjacent slot found');
  
  const bookReq2 = await axios.post(`${API}/bookings`, {
    resourceId: londonResource.id,
    userId: 'qa-user-3',
    startTime: adjacentSlot.start,
    endTime: adjacentSlot.end
  });
  assert(bookReq2.status === 201, 'Adjacent booking failed');
  console.log('✅ Verified adjacent slot can still be booked');

  // 15-16. Test a Europe/London resource and DST dates
  const springDate = '2023-03-27'; // Monday after London Spring Forward
  const dstAvail = await axios.get(`${API}/resources/${londonResource.id}/availability?date=${springDate}&timezone=Europe/London`);
  assert(dstAvail.data.slots.length > 0, 'No slots for DST spring forward date');
  const firstSlot = dstAvail.data.slots[0];
  // 09:00 BST should be 08:00 UTC
  assert(firstSlot.start.includes('T08:00:00.000Z'), `Expected 08:00 UTC, got ${firstSlot.start}`);
  console.log('✅ Tested DST dates for Europe/London (Proved BST +01:00 is active)');

  // 17. Test invalid booking through the API directly
  try {
    await axios.post(`${API}/bookings`, {
      resourceId: londonResource.id,
      userId: 'qa-user-invalid',
      startTime: '2023-11-15T09:00:00Z',
      endTime: '2023-11-15T09:45:00Z' // 45 min duration
    });
    assert.fail('Invalid duration should have failed');
  } catch (err) {
    assert(err.response?.status === 400, `Expected 400, got ${err.response?.status}`);
    console.log('✅ Tested invalid booking directly through API (Wrong duration)');
  }

  console.log('--- QA Test Flow Completed Successfully ---');
}

runQA().catch(err => {
  console.error('❌ QA Test Failed:', err.message);
  if (err.response) {
    console.error('Response body:', err.response.data);
  }
  process.exit(1);
});
