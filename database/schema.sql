-- =====================================================================
-- MediCare AI – Intelligent Healthcare Assistant
-- PostgreSQL Database Schema
-- =====================================================================
-- Run order: this file is self-contained. Execute top to bottom on an
-- empty database, e.g.:
--   psql -U postgres -d medicare_ai -f schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clean slate (safe to re-run during development)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS chat_sender CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS report_file_type CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;

-- ---------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------
CREATE TYPE gender_type        AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'RESCHEDULED');
CREATE TYPE chat_sender        AS ENUM ('USER', 'AI');
CREATE TYPE notification_type  AS ENUM ('APPOINTMENT', 'HEALTH_ALERT', 'SYSTEM', 'DOCTOR_MESSAGE');
CREATE TYPE report_file_type   AS ENUM ('PDF', 'JPG', 'PNG');

-- ---------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(30) NOT NULL UNIQUE,   -- ADMIN, DOCTOR, PATIENT
    description VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- users  (shared identity table for Patient / Doctor / Admin)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number  VARCHAR(20),
    role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email   ON users(email);

-- ---------------------------------------------------------------------
-- patients  (1:1 extension of users where role = PATIENT)
-- ---------------------------------------------------------------------
CREATE TABLE patients (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth     DATE,
    age               INT,
    gender            gender_type,
    blood_group       VARCHAR(5),
    address           VARCHAR(255),
    emergency_contact VARCHAR(20),
    current_disease   VARCHAR(150),
    status            VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_user_id ON patients(user_id);

-- ---------------------------------------------------------------------
-- doctors  (1:1 extension of users where role = DOCTOR)
-- ---------------------------------------------------------------------
CREATE TABLE doctors (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialization      VARCHAR(100) NOT NULL,
    qualification       VARCHAR(150),
    experience_years    INT NOT NULL DEFAULT 0,
    consultation_fee    NUMERIC(10,2) DEFAULT 0,
    available_from      TIME,
    available_to        TIME,
    available_days      VARCHAR(50),         -- e.g. 'MON,TUE,WED,THU,FRI'
    rating              NUMERIC(3,2) DEFAULT 0.0,
    bio                 TEXT,
    profile_image_url   VARCHAR(255),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctors_user_id        ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);

-- ---------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------
CREATE TABLE appointments (
    id               BIGSERIAL PRIMARY KEY,
    patient_id       BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id        BIGINT NOT NULL REFERENCES doctors(id)  ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status           appointment_status NOT NULL DEFAULT 'PENDING',
    symptoms         TEXT,
    notes            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id  ON appointments(doctor_id);
CREATE INDEX idx_appointments_date       ON appointments(appointment_date);
CREATE INDEX idx_appointments_status     ON appointments(status);

-- ---------------------------------------------------------------------
-- medical_records
-- ---------------------------------------------------------------------
CREATE TABLE medical_records (
    id           BIGSERIAL PRIMARY KEY,
    patient_id   BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id    BIGINT REFERENCES doctors(id) ON DELETE SET NULL,
    diagnosis    VARCHAR(255),
    prescription TEXT,
    notes        TEXT,
    record_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor_id  ON medical_records(doctor_id);

-- ---------------------------------------------------------------------
-- chat_history  (AI chatbot conversations)
-- ---------------------------------------------------------------------
CREATE TABLE chat_history (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  VARCHAR(100) NOT NULL,
    sender      chat_sender NOT NULL,
    message     TEXT NOT NULL,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id    ON chat_history(user_id);
CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(150) NOT NULL,
    message    TEXT NOT NULL,
    type       notification_type NOT NULL DEFAULT 'SYSTEM',
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ---------------------------------------------------------------------
-- reports  (uploaded medical reports / files)
-- ---------------------------------------------------------------------
CREATE TABLE reports (
    id           BIGSERIAL PRIMARY KEY,
    patient_id   BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    uploaded_by  BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    report_name  VARCHAR(150) NOT NULL,
    file_path    VARCHAR(500) NOT NULL,
    file_type    report_file_type NOT NULL,
    report_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_patient_id ON reports(patient_id);

-- =====================================================================
-- Seed data
-- =====================================================================

INSERT INTO roles (name, description) VALUES
    ('ADMIN',   'Full system access'),
    ('DOCTOR',  'Manages own appointments, patients, and medical records'),
    ('PATIENT', 'Books appointments, chats with AI assistant, views own records');

-- Sample admin user (password hash is a placeholder bcrypt hash — replace
-- at registration time; never store plaintext passwords).
INSERT INTO users (full_name, email, password_hash, phone_number, role_id, is_active)
VALUES ('System Admin', 'admin@medicareai.com',
        '$2a$10$replace-with-real-bcrypt-hash', '+10000000000',
        (SELECT id FROM roles WHERE name = 'ADMIN'), TRUE);

-- Sample doctor
INSERT INTO users (full_name, email, password_hash, phone_number, role_id, is_active)
VALUES ('Dr. Sarah Mitchell', 'sarah.mitchell@medicareai.com',
        '$2a$10$replace-with-real-bcrypt-hash', '+10000000001',
        (SELECT id FROM roles WHERE name = 'DOCTOR'), TRUE);

INSERT INTO doctors (user_id, specialization, qualification, experience_years,
                      consultation_fee, available_from, available_to, available_days, rating, bio)
VALUES ((SELECT id FROM users WHERE email = 'sarah.mitchell@medicareai.com'),
        'Cardiologist', 'MD, DM Cardiology', 12, 75.00,
        '09:00', '17:00', 'MON,TUE,WED,THU,FRI', 4.80,
        'Specializes in preventive cardiology and heart failure management.');

-- Sample patient
INSERT INTO users (full_name, email, password_hash, phone_number, role_id, is_active)
VALUES ('John Carter', 'john.carter@example.com',
        '$2a$10$replace-with-real-bcrypt-hash', '+10000000002',
        (SELECT id FROM roles WHERE name = 'PATIENT'), TRUE);

INSERT INTO patients (user_id, date_of_birth, age, gender, blood_group, address, emergency_contact, status)
VALUES ((SELECT id FROM users WHERE email = 'john.carter@example.com'),
        '1990-04-12', 36, 'MALE', 'O+', '221B Baker Street, Springfield', '+10000000003', 'ACTIVE');

-- =====================================================================
-- End of schema
-- =====================================================================
