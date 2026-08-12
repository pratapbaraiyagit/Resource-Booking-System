-- 01_init.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "resource" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying NOT NULL,
    "timezone" character varying NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_resource" PRIMARY KEY ("id")
);

CREATE TABLE "availability" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "resource_id" uuid NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_local_time" time without time zone NOT NULL,
    "end_local_time" time without time zone NOT NULL,
    CONSTRAINT "PK_availability" PRIMARY KEY ("id"),
    CONSTRAINT "FK_availability_resource" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE CASCADE
);

CREATE TYPE "booking_status_enum" AS ENUM('CONFIRMED', 'CANCELLED');

CREATE TABLE "booking" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "resource_id" uuid NOT NULL,
    "user_id" character varying NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "status" "booking_status_enum" NOT NULL DEFAULT 'CONFIRMED',
    CONSTRAINT "PK_booking" PRIMARY KEY ("id"),
    CONSTRAINT "FK_booking_resource" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE CASCADE,
    CONSTRAINT "no_overlapping_bookings" EXCLUDE USING gist (
        "resource_id" WITH =,
        tstzrange("start_time", "end_time", '[)') WITH &&
    )
);

CREATE INDEX "IDX_booking_resource_id" ON "booking" ("resource_id");
CREATE INDEX "IDX_availability_resource_id" ON "availability" ("resource_id");
