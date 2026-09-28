# Roll Call Attendance

A modern, responsive school attendance management web application designed for educational institutions to record, track, and audit daily student attendance across classes and faculty.

---

## 1. Project Overview

**Roll Call Attendance** provides educational administrators and teachers with a streamlined, role-based platform for daily attendance workflows. Built as a Single Page Application (SPA), it offers real-time roll call submission, attendance tracking, historical audits, and automated statistical reporting.

### Core Objectives
* Accelerate daily classroom roll call with minimal clicks.
* Maintain student attendance records with historical integrity.
* Detect at-risk attendance patterns early (< 75% attendance rate).
* Provide data export capabilities compliant with spreadsheet security standards.

---

## 2. Technology Stack

Verified dependencies from `package.json`:

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.8` | Declarative component UI |
| **Build Tool & Server** | Vite | `^8.3.0` | Development server and production bundling |
| **Routing** | React Router DOM | `^7.18.3` | Client-side routing with `HashRouter` |
| **Backend as a Service**| Supabase (`@supabase/supabase-js`) | `^2.116.0` | PostgreSQL database, Authentication, and Storage |
| **Iconography** | Lucide React | `^1.45.0` | Accessible iconography |
| **Linter** | Oxlint | `^1.81.0` | High-performance static code analysis |
| **Styling** | Vanilla CSS + CSS Variables | — | Light/Dark theme support and responsive design |

---

## 3. Core Features

* **Authentication & Access Control**: Email/password authentication via Supabase Auth with dedicated role redirection and route guards (`ProtectedRoute`).
* **Attendance Engine**:
  * Four canonical statuses: **Present**, **Absent**, **Late**, and **Leave**.
  * Atomic session and record updates powered by a PostgreSQL RPC transaction (`save_attendance_atomic`).
  * Inactive student preservation: Historical records retain student details even after archive/soft-delete.
  * Overwrite protection: Clear confirmation dialogs when modifying existing attendance records.
  * Unsaved changes warning: Navigation prompts prevent accidental data loss.
* **Student & Class Management**:
  * Class organization by grade, section, room, and academic year.
  * Student enrollment with numeric roll number validation and guardian contact details.
  * Profile avatar upload with client-side canvas compression (150x150 JPEG) and Supabase Storage integration.
* **Teacher Class Assignment**: Many-to-many junction allowing administrators to assign and unassign faculty to multiple classes with confirmation modals.
* **Reporting & Analytics**:
  * Class-level and school-wide attendance metrics.
  * Automatic flagging for students falling below the **75%** attendance benchmark threshold.
  * Multi-filter attendance history logs (filterable by class and date range).
* **Hardened CSV Export**:
  * Full export for institutional history logs and student attendance metrics.
  * Conforms to RFC 4180 with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.
  * Sanitized against Spreadsheet Formula Injection (OWASP CWE-1236).
* **Theme & Accessibility**:
  * Light and Dark mode toggle with persistent state.
  * Distinct keyboard `:focus-visible` styling for interactive controls.
  * Form inputs explicitly coupled to accessible labels (`htmlFor`/`id`) and stateful ARIA toggles (`aria-pressed`).

---

## 4. Role Capabilities

The application enforces strict role separation between Administrators and Teachers:

### Administrator
* **Dashboard**: High-level school KPIs (total students, classes, teachers, overall daily attendance rate) and real-time status table showing which classes have submitted roll call today.
* **Class Management**: Create, edit, and soft-delete academic classes.
* **Student Management**: Enroll students, assign unique roll numbers per class, upload photos, and edit student profiles.
* **Teacher Management**: Register faculty accounts using an isolated Supabase Auth client (preventing admin session replacement), update details, and view assigned classes.
* **Teacher Assignment**: Link faculty members to classes with duplicate assignment prevention.
* **Institutional Reports**: Inspect all historical attendance sessions and download school-wide CSV audit reports.

### Teacher
* **Dashboard**: Quick-glance metrics for assigned classes and one-click links to mark pending attendance.
* **Mark Attendance**: Fast roll call interface with batch marking, status tabs, per-student remarks, and unsaved changes protection.
* **My Classes**: Overview of assigned classes with searchable student rosters.
* **Attendance History**: Historical attendance records for assigned classes with session detail modals.
* **Teacher Reports**: Individual student attendance percentages, at-risk flags, and downloadable student metrics CSV.

---

## 5. Architecture & Project Structure

The frontend is structured around modular layers separating presentation, global application context, and data access:

```text
├── .github/workflows/       # GitHub Pages deployment pipeline
├── public/                  # Static assets and 404.html SPA fallback
├── src/
│   ├── components/
│   │   ├── common/          # Shared UI (StatCard, StatusBadge, StudentAvatar, Modal, ConfirmModal, Card, EmptyState)
│   │   └── layout/          # AppLayout, Navbar, Sidebar, ProtectedRoute
│   ├── constants/           # Canonical constants (attendanceStatus.js, roles.js)
│   ├── context/             # Global React state (AuthContext, ThemeContext, ToastContext)
│   ├── hooks/               # Custom hooks (useAuth.js)
│   ├── pages/
│   │   ├── admin/           # Admin views (AdminDashboard, ClassManagement, StudentManagement, etc.)
│   │   ├── teacher/         # Teacher views (TeacherDashboard, MarkAttendance, MyClasses, etc.)
│   │   └── auth/            # Authentication (LoginPage.jsx)
│   ├── services/            # Supabase client (supabaseClient.js) and data service (dataService.js)
│   ├── utils/               # Utilities (csvExport.js, formatters.js)
│   ├── App.jsx              # HashRouter configuration and lazy-loaded route declarations
│   ├── index.css            # Global CSS variables, reset, and layout styles
│   └── main.jsx             # React DOM root entry point
├── .env.example             # Template for required environment variables
├── package.json             # Scripts and dependencies
└── vite.config.js           # Vite build configuration (base: './')
```

### Key Architectural Patterns
* **Data Caching**: `dataService.js` maintains a 60-second in-memory cache for classes and student rosters to prevent redundant database requests.
* **Atomic RPC**: Multi-row attendance records and session timestamps are saved in a single database transaction via the `save_attendance_atomic` stored procedure.
* **Isolated Auth Client**: Teacher account registration creates a dedicated `createAuthClient` instance to prevent invalidating the administrator's active session.

---

## 6. Development Setup

### Prerequisites
* **Node.js**: `v20.0.0` or higher (verified with Node 20+; GitHub Actions CI runs on Node 22).
* **npm**: `v10.0.0` or higher.

### Installation & Execution

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd roll-call-attendance
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the project root based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Run static linting**:
   ```bash
   npm run lint
   ```

6. **Create a production build**:
   ```bash
   npm run build
   ```
   The compiled bundle will be output to the `dist/` directory.

7. **Preview the production build**:
   ```bash
   npm run preview
   ```

---

## 7. Environment Variables

The application requires connection to a Supabase project via two client environment variables:

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | The HTTPS URL of your Supabase project (e.g. `https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | The public anon/publishable API key for client-side queries |

Define these variables in your root `.env` file:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Note**: Do not commit your `.env` file with production credentials to source control. `.env` is ignored by git in `.gitignore`.

---

## 8. Supabase Backend Prerequisites

To function properly, the Supabase backend project must have the following components configured:

1. **Database Tables**:
   * `public.profiles`: App-level user accounts linked 1:1 with `auth.users`, including `role` (`admin` or `teacher`), `full_name`, `email`, `phone`, and `subject`.
   * `public.classes`: Academic classes and sections with soft-delete support (`is_active`).
   * `public.students`: Enrolled students referencing `class_id` with unique `roll_no` per class.
   * `public.teacher_class_assignments`: Many-to-many junction linking `teacher_id` (`profiles.id`) to `class_id`.
   * `public.attendance_sessions`: One record per class per date, recording `marked_by` and `marked_at`.
   * `public.attendance_records`: Individual student statuses linked to `session_id` and `student_id`.

2. **Atomic RPC Function**:
   * Stored procedure `public.save_attendance_atomic(p_class_id, p_date, p_records, p_teacher_id)` that wraps session upsert and batch record replacement in a single atomic transaction.

3. **Storage Bucket**:
   * A public Supabase Storage bucket named `avatars` for storing student profile photos.

4. **Authentication**:
   * Supabase Auth enabled with Email and Password provider.
   * Initial administrator accounts are provisioned via the Supabase Auth dashboard with appropriate role metadata.

---

## 9. Initial User Accounts & Testing Guide

### Security & Account Policy
For security hygiene, this repository does not include hardcoded passwords or pre-provisioned demo accounts in source control. All user accounts must be provisioned within your own Supabase project.

### Initial Administrator Setup
Public self-registration is intentionally disabled. The initial root administrator account must be created directly in the Supabase Dashboard:

1. Open your **Supabase Project Dashboard**.
2. Navigate to **Authentication** > **Users**.
3. Click **Add User** > **Create User**.
4. Enter an administrative email address and choose a secure password.
5. In the **User Metadata** field, assign the `admin` role:
   ```json
   {
     "role": "admin",
     "full_name": "System Administrator"
   }
   ```
6. Save the user. The database trigger `handle_new_user` automatically creates the corresponding `public.profiles` record and applies the Administrator role.

### Teacher Account Setup
Once the administrator account is provisioned:

1. Open the application and sign in as **Administrator** using your admin credentials.
2. Navigate to **Teacher Management** from the sidebar.
3. Click **Register New Teacher**.
4. Enter the teacher's details:
   * **Full Name**
   * **Email Address**
   * **Phone Number** (11 digits)
   * **Subject / Department**
   * **Temporary Password** (minimum 6 characters required)
5. Submit the form. The application provisions the teacher's Supabase Auth user via an isolated authentication client and generates their matching `public.profiles` entry without interrupting the administrator's active session.

### Testing & Role Verification
* **Administrator Login**: On the login screen, select **Administrator** and enter your admin credentials. Upon successful sign-in, you are directed to the Admin Dashboard (`#/admin`).
* **Teacher Login**: Select **Teacher** and sign in with the teacher's credentials. You are directed to the Teacher Dashboard (`#/teacher`).
* **Access Control**: Client-side route protection (`ProtectedRoute`) prevents unauthorized access across roles (e.g. teachers navigating directly to `#/admin` are safely redirected to `#/unauthorized`).

---

## 10. Production Deployment

The project is configured for automated deployment to **GitHub Pages**:

* **GitHub Actions Workflow**: Located at `.github/workflows/deploy-pages.yml`. Triggered automatically on push to the `master` branch or manually via workflow dispatch.
* **Client-Side Routing Support**:
  * Uses `HashRouter` (`#/route`) to prevent HTTP 404 errors on static hosts that do not support arbitrary path rewriting.
  * Includes `public/404.html` containing an SPA redirect script to safely catch and route direct deep links.
* **Relative Base Path**: `vite.config.js` sets `base: './'` so assets resolve cleanly under subpath hosting.
* **CI Secrets**: Production builds in GitHub Actions ingest `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from GitHub Repository Secrets.
