# Feature Specification: Ibn Sina Medical Center — Full Platform

**Feature Branch**: `001-ibn-sina-platform`
**Created**: 2026-04-18
**Status**: Draft
**Spec Directory**: `specs/001-ibn-sina-platform/`

---

## Overview

Ibn Sina Medical Center requires a bilingual (Arabic / English), RTL-first digital platform serving four distinct user roles: **Patients**, **Doctors**, **Admins**, and **Receptionists**. The platform is composed of four interconnected modules:

| Module | Audience | Primary Purpose |
|---|---|---|
| Public Website | Anonymous visitors + Patients | Discover services, browse doctors, book & pay for appointments |
| Patient Portal | Registered Patients | Self-service health record and appointment management |
| Admin Dashboard | Admins + Receptionists | Full operational control of the medical center |
| Doctor Portal | Doctors | Daily schedule view and clinical note-taking |

---

## User Scenarios & Testing

### User Story 1 — Patient Books and Pays for an Appointment (Priority: P1)

A prospective patient visits the public website, browses available doctors by specialty, selects a doctor, picks an available time slot, and completes payment — all without needing to log in first. On confirmation the patient receives a booking reference and can optionally create a portal account to track the appointment later.

**Why this priority**: This is the core revenue-generating action of the entire platform. Without it, the platform delivers no clinical or business value.

**Independent Test**: A new visitor can land on the homepage, filter doctors by specialty, view a doctor's profile and available slots, book a slot, complete payment, and receive a confirmation — with no prior account — in under 5 minutes.

**Acceptance Scenarios**:

1. **Given** a visitor on the homepage, **When** they navigate to the Doctors Directory and filter by specialty, **Then** a list of matching doctors is displayed with name, photo, specialty, rating, and next available slot.
2. **Given** a visitor on a doctor's profile page, **When** they select a date, **Then** only real-time available time slots are shown; already-booked slots are visually disabled.
3. **Given** a visitor who selected a slot, **When** they provide their name, phone number, and national ID and proceed to payment, **Then** they are presented with a secure payment screen showing the consultation fee.
4. **Given** a visitor on the payment screen, **When** payment is successfully processed, **Then** a booking confirmation page is shown with a unique reference number, and an SMS/email confirmation is sent.
5. **Given** a visitor who completes a booking, **When** they choose to "create an account", **Then** their booking is automatically linked to the new patient account.
6. **Given** a visitor on the payment screen, **When** payment fails, **Then** the selected time slot is released, an error message is shown, and the visitor may retry with the same or a different slot.

---

### User Story 2 — Patient Manages Their Health Journey via the Portal (Priority: P2)

A registered patient logs into their personal portal to review upcoming and past appointments, view their medical history summary (diagnoses, notes added by doctors), download payment receipts, and cancel or reschedule appointments within the allowed window.

**Why this priority**: Patient retention and satisfaction depend on transparent self-service access to their health data. It also reduces administrative load on receptionists.

**Independent Test**: A registered patient can log in, see all their appointments (upcoming and past), open an appointment's detail to view doctor notes, and download a PDF receipt — without contacting staff.

**Acceptance Scenarios**:

1. **Given** an unregistered visitor who clicks "Patient Login", **When** they register with email + password and verify their email, **Then** they are logged into a personal dashboard showing their appointments.
2. **Given** a logged-in patient, **When** they view their appointments list, **Then** upcoming appointments are shown first, each with doctor name, specialty, date/time, status badge, and a "Cancel / Reschedule" option if within the allowed window.
3. **Given** a logged-in patient viewing a past appointment, **When** they click to open it, **Then** they see the doctor's notes, any diagnoses recorded, and a download link for the payment receipt.
4. **Given** a logged-in patient viewing their Medical History section, **When** they open it, **Then** a chronological summary of all past consultations is shown, including doctor, specialty, date, and notes (no lab results or imaging — out of scope for v1).
5. **Given** a logged-in patient with an upcoming appointment, **When** they choose to cancel and it is within the cancellation window (≥24 hours before), **Then** the appointment is cancelled, the slot is freed, and a cancellation confirmation is sent.
6. **Given** a logged-in patient, **When** they update their profile (name, phone, date of birth), **Then** changes are saved and reflected immediately.

---

### User Story 3 — Admin Operates the Medical Center Daily (Priority: P3)

An admin logs into the dashboard to manage all appointments (view, reschedule, cancel, mark as completed), manage the doctor roster (add/edit/deactivate doctors, define their weekly schedule and vacation days), manage patient records, and handle content on the public website.

**Why this priority**: Without administrative control, the operational backbone of the center is absent. Admins and Receptionists are the highest-frequency internal users.

**Independent Test**: An admin can log in, add a new doctor with a weekly schedule, block a vacation day, and see how that affects slot availability on the public booking page — all within one session.

**Acceptance Scenarios**:

1. **Given** an admin on the Appointments Management page, **When** they view the list, **Then** all appointments are shown with filters by date, doctor, status (pending, confirmed, completed, cancelled), and patient name search.
2. **Given** an admin who selects an appointment, **When** they click "Reschedule", **Then** they can pick a new available slot for the same doctor and the patient is notified automatically.
3. **Given** an admin on the Doctors Management page, **When** they click "Add Doctor", **Then** they can fill a form with name (Arabic + English), specialty, bio, photo, consultation fee, and weekly schedule (days + hours per day).
4. **Given** an admin on a doctor's schedule page, **When** they mark a date range as vacation/unavailable, **Then** no slots are offered to patients for those dates, effective immediately.
5. **Given** an admin on the Patients Management page, **When** they search a patient by name or national ID, **Then** they can view the patient's appointment history and contact info; they cannot edit clinical notes.
6. **Given** an admin on the Content Management page, **When** they edit homepage banner text or a service description in Arabic and English, **Then** the change is reflected on the public website within seconds after saving.
7. **Given** an admin on the Analytics page, **When** they select a date range, **Then** they see: total appointments, revenue collected, new patients registered, appointments by specialty, and a day-by-day chart.
8. **Given** an admin on the User Roles page, **When** they create a Receptionist account, **Then** the receptionist can log in and access Appointments and Patients management but cannot access Analytics, Doctors management, or Content management.

---

### User Story 4 — Doctor Reviews Schedule and Documents Consultations (Priority: P4)

A doctor logs into their portal to see today's patient schedule, review basic patient details before a consultation, and write or update consultation notes and status after seeing a patient.

**Why this priority**: The doctor portal supports clinical efficiency and links administrative booking data to clinical documentation in a single interface.

**Independent Test**: A doctor can log in, view their schedule for the current day, open a patient's record, add consultation notes, and mark the appointment as "Completed" — without any admin assistance.

**Acceptance Scenarios**:

1. **Given** a logged-in doctor, **When** they open the portal, **Then** they immediately see today's appointments listed in chronological order with patient name, time, and appointment status.
2. **Given** a doctor who clicks on an appointment, **When** the patient detail panel opens, **Then** they see: patient name, age, gender, contact info, and all previous appointment notes from this doctor (other doctors' notes are not visible — out of scope for v1).
3. **Given** a doctor on an appointment's detail panel, **When** they type consultation notes and click "Save Notes", **Then** the notes are saved and timestamped, and the patient can see them in the Patient Portal under that appointment.
4. **Given** a doctor on an appointment, **When** they mark it "Completed", **Then** the appointment status updates across all views (admin dashboard, patient portal) in real time.
5. **Given** a doctor who wants to view a future day's schedule, **When** they navigate to the calendar view, **Then** they see all booked appointments for that day; they cannot modify appointment slots.

---

### User Story 5 — Visitor Explores the Center in Their Preferred Language (Priority: P5)

Any visitor to the public website can switch between Arabic (RTL, default) and English (LTR) at any time. The full content — doctor names, service descriptions, navigation labels, error messages, and form placeholders — is available in both languages.

**Why this priority**: Saudi Arabia's MOH requires Arabic as the primary language; catering to non-Arabic speakers (e.g., expats) is a business differentiator.

**Independent Test**: A visitor can load the site in English, complete the entire appointment booking flow including payment, and receive the confirmation email in English — without encountering any Arabic-only text.

**Acceptance Scenarios**:

1. **Given** a visitor on any page, **When** they click the language switcher, **Then** the full page re-renders in the selected language and RTL/LTR direction is applied globally without a page reload.
2. **Given** a visitor who selected English, **When** they navigate to the Doctors Directory, **Then** all doctor names, specialties, and bios appear in English (or fall back to Arabic with a visual indicator if an English translation is not provided).
3. **Given** a visitor who selected Arabic (default), **When** they fill in any form, **Then** all placeholders, validation messages, and success/error states are displayed in Arabic.
4. **Given** a patient who completed a booking in English, **When** they receive the confirmation communication, **Then** it is written in English.

---

### Edge Cases

- What happens when a patient tries to book the last available slot simultaneously with another patient? The system must guarantee only one booking succeeds; the other receives an "unavailable" message and is directed to the next available slot.
- What happens if payment is initiated but the gateway times out before confirming? The slot must remain temporarily held for a configurable grace period (default: 10 minutes), then released if no confirmation arrives.
- What happens when a doctor's availability is deleted while a patient already has a confirmed booking in that slot? The booking MUST NOT be automatically cancelled; an admin must handle it manually and notify the patient.
- What happens if a patient's account is created with the same national ID as an existing patient? The system must prevent duplicate accounts and prompt the user to log in or reset their password.
- What if the admin deactivates a doctor who has future appointments? The system must warn the admin and list the affected appointments before allowing deactivation.
- What if a patient cancels within the non-refundable window (<24 hours)? The slot is freed but no refund is issued; the patient sees a clear message about the policy before confirming cancellation.

---

## Requirements

### Functional Requirements

#### Public Website

- **FR-001**: The system MUST display a homepage with a hero section, featured specialties, a "Book Now" call-to-action, center contact information, and links to all major sections in both Arabic and English.
- **FR-002**: The system MUST provide a searchable and filterable Doctors Directory listing all active doctors by specialty, with each doctor's photo, name (both languages), specialty, rating, and earliest available slot.
- **FR-003**: The system MUST display a dedicated Services page listing all available medical specialties and services with descriptions in both Arabic and English.
- **FR-004**: The system MUST provide a Doctor Profile page showing full bio, qualifications, consultation fee, and an interactive calendar for slot selection.
- **FR-005**: The system MUST show only real-time available slots during booking; slots MUST be updated immediately when another booking is confirmed or cancelled.
- **FR-006**: The system MUST allow a visitor to book an appointment by providing name, phone number, national ID, and completing payment — without requiring a pre-existing account.
- **FR-007**: The system MUST process payments through at least one supported secure payment gateway; the user MUST see the total fee before payment is initiated.
- **FR-008**: The system MUST send a booking confirmation to the patient by SMS and/or email immediately after successful payment, containing the booking reference, doctor name, date, and time.
- **FR-009**: The system MUST support instantaneous language switching between Arabic (RTL) and English (LTR) on all public pages.

#### Patient Portal

- **FR-010**: The system MUST allow patients to register with email and password; email verification MUST be completed before the account is activated.
- **FR-011**: The system MUST support secure patient login with password-reset capability via email.
- **FR-012**: The system MUST display all of the patient's appointments (upcoming and past) sorted by date, with status, doctor name, specialty, and date/time visible at a glance.
- **FR-013**: The system MUST allow a patient to cancel an appointment if it is at least 24 hours before the scheduled time; a cancellation policy summary MUST be shown before confirmation.
- **FR-014**: The system MUST show the doctor's consultation notes for each past appointment once the doctor has saved them.
- **FR-015**: The system MUST present a Medical History summary view listing all past consultations chronologically, including doctor, specialty, date, and notes.
- **FR-016**: The system MUST allow patients to download a payment receipt (PDF) for each completed appointment.
- **FR-017**: The system MUST allow patients to update their personal profile details (name, phone, date of birth, profile photo).

#### Admin Dashboard

- **FR-018**: The system MUST allow admins to view, search, filter, reschedule, and cancel any appointment across all doctors.
- **FR-019**: The system MUST allow admins to add, edit, and deactivate doctors including their profile details, consultation fee, and weekly schedule.
- **FR-020**: The system MUST allow admins to define and modify a doctor's recurring weekly availability (working days, start/end hours, slot duration) and mark specific date ranges as unavailable.
- **FR-021**: The system MUST warn an admin before deactivating a doctor who has future confirmed appointments, listing those appointments.
- **FR-022**: The system MUST allow admins to view patient profiles (contact info + appointment history) and search by name or national ID.
- **FR-023**: The system MUST provide a Content Management interface for editing homepage sections (hero text, featured specialties) and Services page descriptions in both Arabic and English.
- **FR-024**: Content changes made by admins MUST be reflected on the public website within 30 seconds of saving.
- **FR-025**: The system MUST provide an Analytics dashboard showing: total appointments by day/week/month, total revenue by period, new patient registrations, appointment breakdown by specialty, and a trend chart.
- **FR-026**: The system MUST allow admins to create, edit, and deactivate user accounts and assign them one of the defined roles: Admin, Receptionist.
- **FR-027**: The system MUST enforce role-based access so that Receptionists can access Appointments and Patients management only; Analytics, Doctors management, and Content management are restricted to Admins.

#### Doctor Portal

- **FR-028**: The system MUST show the logged-in doctor's appointments for the current day on their portal home screen, sorted by time, with patient name and status.
- **FR-029**: The system MUST allow the doctor to view a specific patient's contact information and all notes previously recorded by that same doctor for that patient.
- **FR-030**: The system MUST allow the doctor to write, save, and update consultation notes for any appointment; notes are timestamped and immutable once 24 hours have passed (edit window closes).
- **FR-031**: The system MUST allow the doctor to mark an appointment as "Completed", which updates the status across all system views in real time.
- **FR-032**: The system MUST allow the doctor to navigate to any future date on a calendar to preview their upcoming schedule (read-only).

### Key Entities

- **User**: Represents any account holder; attributes include: name (Arabic + English), email, phone, national ID (patients only), role (Patient / Doctor / Admin / Receptionist), account status, preferred language, profile photo.
- **Doctor**: Extends User with: specialty, qualifications, bio (Arabic + English), consultation fee, average rating, activation status.
- **Availability Schedule**: Linked to a Doctor; represents recurring weekly working hours (day of week, start time, end time, slot duration in minutes).
- **Unavailability Block**: Linked to a Doctor; represents a date range during which no slots are offered (vacation, leave).
- **Appointment**: Core transactional entity; references Patient (User), Doctor, time slot, status (pending-payment / confirmed / completed / cancelled / no-show), booking reference number, patient-provided notes at booking time.
- **Consultation Note**: Linked to an Appointment and a Doctor; contains note text, creation timestamp, last-edited timestamp.
- **Payment**: Linked to an Appointment; records fee amount, currency (SAR), payment gateway, transaction reference, status (pending / succeeded / failed / refunded), timestamp.
- **Service / Specialty**: Defines a medical specialty or service offered; bilingual name and description; linked to zero or more Doctors.
- **Content Block**: Represents an editable section of the public website (e.g., hero title, hero subtitle, service description); identified by a unique key; stores Arabic and English versions.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A patient with no prior account can discover a doctor, select a slot, pay, and receive a booking confirmation in under 5 minutes from landing on the homepage.
- **SC-002**: Available time slots displayed during booking reflect actual real-time availability; a slot that was just booked by another user becomes unavailable within 3 seconds.
- **SC-003**: The public website fully renders in Arabic (RTL) and English (LTR) with no untranslated strings visible to the end user in either language.
- **SC-004**: All pages of the public website pass WCAG 2.1 AA color contrast checks in both Arabic and English layouts.
- **SC-005**: The platform supports at least 200 concurrent booking sessions without degrading response times beyond 2× baseline.
- **SC-006**: An admin can add a new doctor with a complete schedule and have their slots appear on the public booking calendar within 1 minute of saving.
- **SC-007**: Content edits made through the Admin Dashboard are visible on the public website within 30 seconds of saving.
- **SC-008**: A doctor can write and save consultation notes for all their daily appointments without leaving the Doctor Portal.
- **SC-009**: Payment receipts are generated and available for download by patients within 60 seconds of payment confirmation.
- **SC-010**: The platform correctly enforces role-based access: a Receptionist user is unable to access Admin-only sections (verified by attempting direct navigation to restricted URLs).
- **SC-011**: The system prevents double-booking of a time slot under concurrent booking attempts — verified by load testing two simultaneous booking requests for the same slot.

---

## Assumptions

- **Payment gateways**: HyperPay (primary, SAR-native) and Stripe (secondary, for international cards) are the target payment processors. Both require sandbox testing before going live.
- **SMS provider**: An SMS gateway (e.g., Unifonic or Taqnyat) is required for booking confirmations and cancellation notifications; the specific provider will be confirmed during planning.
- **File storage**: Uploaded images (doctor photos, patient profile photos) and documents (payment receipts) will be stored in a cloud-based media storage service; Cloudinary is the preferred option.
- **Cancellation policy**: The 24-hour cancellation window is a business rule; no automatic refunds are in scope for v1. Refund handling, if needed, is a manual admin process.
- **Medical history scope**: v1 shows only consultation notes written by Ibn Sina doctors within this platform. Lab results, imaging, and external records are explicitly out of scope.
- **Doctor self-service**: Doctors cannot modify their own schedule or fee through the portal; only Admins can change those. Doctors may request changes through a manual process.
- **Notifications**: Email and SMS notifications cover: booking confirmation, cancellation confirmation, and appointment reminder (24 hours before). Push notifications are out of scope for v1.
- **Lab/Pharmacy integration**: No integration with lab systems or pharmacy dispensing is in scope for v1.
- **National ID format**: Saudi national ID (10-digit) is the primary patient identifier; Iqama (residency permit) numbers for non-Saudi residents are treated identically for booking purposes.
- **Appointment duration**: All consultations for a given doctor use the same configurable slot duration (e.g., 30 minutes); per-appointment duration variation is out of scope for v1.
- **Mobile app**: The platform is a responsive web application. Native iOS/Android apps are out of scope for v1.
- **Data residency**: All patient data is stored on servers in Saudi Arabia (KSA) to comply with MOH data governance requirements.
- **Audit logging**: All create, update, and delete actions on clinical and financial data are logged with actor identity, timestamp, and change summary. The log is visible to Admins only.
