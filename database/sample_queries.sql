-- =====================================================================
-- MediCare AI – Common Queries
-- A starter set of queries the backend service layer will rely on.
-- =====================================================================

-- 1) Find a user by email (used by login / Spring Security UserDetailsService)
-- SELECT u.*, r.name AS role_name
-- FROM users u JOIN roles r ON r.id = u.role_id
-- WHERE u.email = :email;

-- 2) List all patients with basic profile info (Patient Management page)
-- SELECT p.id, u.full_name, p.age, p.gender, p.current_disease, p.status
-- FROM patients p JOIN users u ON u.id = p.user_id
-- ORDER BY u.full_name;

-- 3) Search patients by name or disease (search bar)
-- SELECT p.id, u.full_name, p.age, p.gender, p.current_disease, p.status
-- FROM patients p JOIN users u ON u.id = p.user_id
-- WHERE u.full_name ILIKE '%' || :keyword || '%'
--    OR p.current_disease ILIKE '%' || :keyword || '%';

-- 4) List doctors by specialization (Doctor Management / Book Appointment page)
-- SELECT d.id, u.full_name, d.specialization, d.experience_years, d.rating
-- FROM doctors d JOIN users u ON u.id = d.user_id
-- WHERE d.specialization = :specialization;

-- 5) Upcoming appointments for a given doctor
-- SELECT a.id, up.full_name AS patient_name, a.appointment_date, a.appointment_time, a.status
-- FROM appointments a
-- JOIN patients p ON p.id = a.patient_id
-- JOIN users up ON up.id = p.user_id
-- WHERE a.doctor_id = :doctorId AND a.appointment_date >= CURRENT_DATE
-- ORDER BY a.appointment_date, a.appointment_time;

-- 6) Dashboard widget counts (User Dashboard)
-- SELECT
--   (SELECT COUNT(*) FROM patients)                                   AS total_patients,
--   (SELECT COUNT(*) FROM doctors)                                    AS total_doctors,
--   (SELECT COUNT(*) FROM appointments)                               AS total_appointments,
--   (SELECT COUNT(*) FROM reports)                                    AS reports_uploaded;

-- 7) Disease distribution chart data
-- SELECT current_disease, COUNT(*) AS patient_count
-- FROM patients
-- WHERE current_disease IS NOT NULL
-- GROUP BY current_disease
-- ORDER BY patient_count DESC;

-- 8) Patient growth over time (monthly signups)
-- SELECT date_trunc('month', u.created_at) AS month, COUNT(*) AS new_patients
-- FROM users u
-- JOIN roles r ON r.id = u.role_id AND r.name = 'PATIENT'
-- GROUP BY month
-- ORDER BY month;

-- 9) Chat history for a session (AI Chatbot page)
-- SELECT sender, message, is_emergency, created_at
-- FROM chat_history
-- WHERE session_id = :sessionId
-- ORDER BY created_at;

-- 10) Unread notifications for a user
-- SELECT id, title, message, type, created_at
-- FROM notifications
-- WHERE user_id = :userId AND is_read = FALSE
-- ORDER BY created_at DESC;

-- 11) Admin: chatbot usage analytics (messages per day)
-- SELECT date_trunc('day', created_at) AS day, COUNT(*) AS message_count
-- FROM chat_history
-- GROUP BY day
-- ORDER BY day DESC;

-- 12) Reports for a specific patient (Medical Reports page)
-- SELECT id, report_name, file_type, report_date
-- FROM reports
-- WHERE patient_id = :patientId
-- ORDER BY report_date DESC;
