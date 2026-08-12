-- Test Overlap Script
\echo '1. Verifying schema for booking table...'
\d booking

\echo '2. Inserting test resource...'
INSERT INTO resource (id, name, timezone) VALUES ('11111111-1111-1111-1111-111111111111', 'Test Room', 'America/New_York');

\echo '3. Inserting first booking (10:00-10:30) - SHOULD SUCCEED'
INSERT INTO booking (resource_id, user_id, start_time, end_time) 
VALUES ('11111111-1111-1111-1111-111111111111', 'user1', '2023-10-10 10:00:00Z', '2023-10-10 10:30:00Z');

\echo '4. Inserting overlapping booking (10:15-10:45) - SHOULD FAIL'
INSERT INTO booking (resource_id, user_id, start_time, end_time) 
VALUES ('11111111-1111-1111-1111-111111111111', 'user2', '2023-10-10 10:15:00Z', '2023-10-10 10:45:00Z');

\echo '5. Inserting adjacent booking (10:30-11:00) - SHOULD SUCCEED'
INSERT INTO booking (resource_id, user_id, start_time, end_time) 
VALUES ('11111111-1111-1111-1111-111111111111', 'user3', '2023-10-10 10:30:00Z', '2023-10-10 11:00:00Z');

\echo '6. Final bookings in table:'
SELECT id, user_id, start_time, end_time FROM booking ORDER BY start_time;
