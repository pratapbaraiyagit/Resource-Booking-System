# Resource Booking System

## Overview
A robust, timezone-aware Resource Booking System designed to mathematically guarantee zero double-bookings. It dynamically projects resource availability across varying global time zones seamlessly taking into account local Daylight Saving Time (DST) shifts.

## Tech Stack
* **Frontend:** React, TypeScript, Vite
* **Backend:** NestJS, TypeScript
* **Database:** PostgreSQL (with `btree_gist` extension)
* **Infrastructure:** Docker (for PostgreSQL)

## Running Locally

**1. Clone the repository and install dependencies:**
```bash
# In the backend directory
cd backend
npm install

# In the frontend directory
cd ../frontend
npm install
```

**2. Start PostgreSQL (Docker):**
Ensure Docker is running, then execute:
```bash
cd backend
npm run db:up
```

**3. Run Database Migrations:**
```bash
npm run typeorm schema:sync
```

**4. Seed the Database:**
Seeds the database with timezone-aware testing resources (e.g., Europe/London, America/New_York) and weekly recurring availability rules.
```bash
npm run seed
```

**5. Start Backend:**
```bash
npm run start:dev
```

**6. Start Frontend:**
Open a new terminal window:
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:5173/` (or the port Vite outputs) in your browser.

**7. Run Tests:**
In the `backend` directory, run the Unit and Concurrency/E2E test suites:
```bash
npm run test
npm run test:e2e
```

## Architecture
- **Frontend:** Completely stateless regarding Timezone calculations and slot generation. It simply fetches pre-computed availability chunks from the backend and renders them. It passes exact UTC Instants (`startTime`, `endTime`) directly to the backend for booking.
- **Backend:** The single source of truth for generating valid slots. It interprets recurring `Availability` rules based on the strict `timezone` of the target `Resource`, transforming local time mappings into absolute UTC instants, dynamically adapting to DST gaps/overlaps.
- **Database:** PostgreSQL is entirely responsible for concurrent booking integrity. The backend completely offloads overlap prevention to a native PostgreSQL Exclusion Constraint, meaning no software-level race condition can bypass it.

## Database Design
* **Resource:** Contains a unique `id`, a `name`, and crucially, an IANA `timezone` string (e.g., `Europe/London`).
* **Weekly Availability:** Defines recurring bounds (e.g., `dayOfWeek`, `startTime` as '09:00', `endTime` as '17:00'). These local times are projected dynamically into absolute instants by mapping them to the parent Resource's `timezone`.
* **Booking:** Contains the `resourceId`, `userId`, and the booking bounds (`startTime` and `endTime`) stored exclusively as absolute UTC `timestamptz`.

## Double-Booking Protection
**PostgreSQL is the absolute source of truth for overlap prevention.**

A `SELECT-then-INSERT` application-level check is fundamentally unsafe in high-throughput environments due to race conditions. Two concurrent requests might both `SELECT` and determine a slot is free before either commits an `INSERT`, resulting in a double-booking.

Instead, we utilize PostgreSQL's `btree_gist` extension to enforce a strict **Exclusion Constraint**:
```sql
ALTER TABLE booking ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  "resourceId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
);
```

If two bookings attempt to occupy overlapping boundaries for the same resource simultaneously, PostgreSQL physically rejects the second write. 
The NestJS backend traps this specific exception and cleanly converts the database violation into an **HTTP 409 Conflict** error response for the frontend.

## Timezones and DST
* **Resource-Local Definitions:** Availability is defined in resource-local time (e.g., 09:00 to 17:00).
* **IANA Zones:** Every resource dictates its exact IANA timezone representation (e.g., `Europe/London`), allowing implicit handling of geographical nuances like DST.
* **Storage:** Booking instants are strictly resolved and stored as `timestamptz`. UTC is the canonical instant.
* **Separation of Concerns:** The backend generates timeslots in the Resource's timezone, converts them to absolute UTC bounds for booking integrity, and then projects display strings into the User's requested `displayTimezone`.
* **DST:** Timezone manipulation is handled via `date-fns-tz` to accurately calculate boundary jumps (e.g., Spring Forward and Fall Back) rather than using fragile, hardcoded manual UTC integer offsets.

## Slot Length
Fixed at precisely 30 minutes. 

## Interval Semantics
Booking boundaries utilize `[start, end)` half-open intervals. 
A slot occupying `[09:00, 09:30)` is inherently compatible with an adjacent slot occupying `[09:30, 10:00)` because the exact instant of `09:30:00.000` is included in the latter, but excluded from the former.

## Testing
The `backend` is strictly tested natively via `Jest`:
- **Availability Tests:** Unit tests verifying recursive generation logic.
- **Timezone Tests:** Unit validations resolving accurate boundaries for users globally separated from the origin Resource.
- **DST Tests:** Verifying safe boundary calculation during the volatile `Spring Forward`/`Fall Back` transition days in Europe and the US.
- **Overlapping Booking Tests:** E2E validation ensuring `409` conflict responses for identical boundaries.
- **Concurrent Booking Test:** A highly aggressive E2E concurrency test (`test/concurrent-bookings.e2e-spec.ts`). This explicitly fires two `POST /bookings` requests simultaneously using `Promise.all()`. The test mathematically asserts that exactly **one** returns a `201 Created` and exactly **one** returns a `409 Conflict`. 

## Assumptions
* Bookings are strictly fixed to 30-minute block increments aligned precisely to the top or bottom of the hour.
* Resources have daily recurring limits tied directly to weekdays (1-7), ignoring singular date overrides (e.g., public holidays).
* The user interface relies on `Intl.DateTimeFormat().resolvedOptions().timeZone` to ascertain the default viewing context.

## What I Would Improve With More Time
* Implement dynamic schema migrations directly through TypeORM migrations (with raw up/down scripts) rather than using a static seed `.sql` script or relying on `synchronize: true` for the initial entity schema generation.
* Implement pagination for the generated availability slot grids for spans larger than a single day.
* Improve frontend UX to show a visual confirmation overlay over the exact grid position when a booking completes rather than utilizing an isolated toast component.
