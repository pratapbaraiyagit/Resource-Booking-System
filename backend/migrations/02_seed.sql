-- 02_seed.sql

-- Upsert Resources to ensure idempotency
INSERT INTO "resource" (id, name, timezone) 
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Room A', 'Europe/London')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, timezone = EXCLUDED.timezone;

INSERT INTO "resource" (id, name, timezone)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Room B', 'America/New_York')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, timezone = EXCLUDED.timezone;

INSERT INTO "resource" (id, name, timezone)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Room C', 'Asia/Kolkata')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, timezone = EXCLUDED.timezone;

-- Delete existing availabilities for these resources to remain idempotent
DELETE FROM "availability" WHERE resource_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Insert recurring weekly availability
-- Note: day_of_week mapping: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

-- Room A (Europe/London, Mon-Fri, 09:00-17:00)
INSERT INTO "availability" (resource_id, day_of_week, start_local_time, end_local_time) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '09:00', '17:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '09:00', '17:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '09:00', '17:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, '09:00', '17:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, '09:00', '17:00');

-- Room B (America/New_York, Mon-Fri, 09:00-17:00)
INSERT INTO "availability" (resource_id, day_of_week, start_local_time, end_local_time) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, '09:00', '17:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, '09:00', '17:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, '09:00', '17:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, '09:00', '17:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, '09:00', '17:00');

-- Room C (Asia/Kolkata, Mon-Sat, 10:00-18:00)
INSERT INTO "availability" (resource_id, day_of_week, start_local_time, end_local_time) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 1, '10:00', '18:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 2, '10:00', '18:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 3, '10:00', '18:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 4, '10:00', '18:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 5, '10:00', '18:00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 6, '10:00', '18:00');
