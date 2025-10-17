# Admin Feature Documentation

This document describes the newly implemented admin authentication system and dashboard improvements.

## Overview

The healthcare platform now has a complete separation of authentication flows:
- **Patients**: Blue theme - Standard user registration and login
- **Doctors**: Green theme - Professional registration with verification workflow  
- **Admins**: Purple theme - Secure admin access with secret-based registration

## Admin Authentication

### Admin Registration

Admin accounts require a special registration secret to prevent unauthorized admin creation.

**Endpoint**: `POST /api/v1/auth/admin/register`

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "secure_password_12chars",
  "admin_secret": "your-admin-secret-from-env"
}
```

**Environment Configuration**:
```bash
# In backend .env or .env.dev
ADMIN_REGISTRATION_SECRET=your-secure-admin-secret-here
```

**Response** (201 Created):
```json
{
  "id": 1,
  "email": "admin@example.com",
  "role": "admin"
}
```

**Error Cases**:
- 403 Forbidden - Invalid admin secret
- 400 Bad Request - Email already registered
- 422 Unprocessable Entity - Invalid email or password too short

### Admin Login

Admin login is separate from patient/doctor login and verifies the user has admin role.

**Endpoint**: `POST /api/v1/auth/admin/login`

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "secure_password_12chars"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 900
}
```

Sets `refresh_token` HTTP-only cookie for token refresh.

**Error Cases**:
- 401 Unauthorized - Invalid email/password
- 403 Forbidden - User is not an admin (has patient or doctor role)
- 429 Too Many Requests - Rate limit exceeded

**Frontend Access**: `/auth/admin/login`
- Not linked from main navigation (security by obscurity)
- Distinct purple/indigo theme
- Professional admin-focused messaging

## Admin Dashboard

### Access
- **URL**: `/dashboard/admin`
- **Protection**: Middleware enforces admin role
- **Redirect**: Non-admins redirected to their appropriate dashboard

### Features

#### 1. Statistics Overview
Three stat cards showing:
- **Pending**: Doctors awaiting verification
- **Verified**: Approved doctors
- **Total**: All registered doctors

#### 2. Doctor Management Tabs

**Pending Tab**:
- Lists all doctors with `verified=false`
- Shows: Name, Email, Clinic, Location, Registration Date
- Actions:
  - ✅ Approve (green checkmark) - Sets verified=true
  - ❌ Reject (red X) - Keeps verified=false
- Real-time updates on action

**Verified Tab**:
- Lists all doctors with `verified=true`
- Shows: Name, Email, Clinic, Location, Registration Date, Verified badge
- Read-only view of approved doctors

#### 3. API Integration
Uses backend endpoints:
- `GET /api/v1/admin/doctors?status=pending`
- `GET /api/v1/admin/doctors?status=verified`
- `POST /api/v1/admin/doctors/{doctor_id}/verify`

## Enhanced Dashboard Interfaces

### Doctor Dashboard (`/dashboard/doctor`)

**Improvements**:
- **Stats Cards**: Today's appointments, upcoming, completed count
- **Appointment List**: Shows next appointments with patient details
- **Status Chips**: Visual indicators (Booked, Confirmed, Cancelled, Completed)
- **Quick Actions**: Cards for managing availability and profile
- **Professional Design**: Green/teal theme matching practitioner identity

**Features**:
- Fetches appointments from `/api/v1/doctors/me/appointments`
- Filters to show only upcoming appointments
- Responsive layout with Material-UI components
- Empty state messaging when no appointments

### Patient Dashboard (`/dashboard/patient`)

**Status**: Already well-designed, maintained existing quality
- Shows patient's appointment history
- Status tracking with colored chips
- Doctor information display
- Appointment reasoning visible

### Admin Dashboard (`/dashboard/admin`)

**New Implementation**:
- Complete doctor verification workflow
- Tabbed interface for pending/verified doctors
- Inline approve/reject actions
- Real-time stats and counts
- Professional admin-focused purple theme
- Responsive table layout

## Security Features

### Access Control

**Middleware Protection** (`src/middleware.ts`):
```typescript
// Admin routes require admin role
/dashboard/admin -> checks role === 'admin'

// Doctor routes require doctor role  
/dashboard/doctor -> checks role === 'doctor'

// Patient routes require patient role
/dashboard/patient -> checks role === 'patient'
```

**Redirects**:
- Wrong role → Appropriate dashboard for their role
- No auth → Login page with callback URL
- Unknown role → Home page

### Backend Authorization

**Role Verification**:
- `get_current_admin` dependency requires admin role
- `get_current_doctor` dependency requires doctor role
- `get_current_patient` dependency requires patient role

**Token Validation**:
- JWT tokens include user role in claims
- Token validation on every protected request
- Refresh tokens rotated on use
- Logout blacklists tokens in Redis

## Testing

### Backend Tests
```bash
cd backend
python3 -m pytest app/tests/test_auth.py -v
```

All 8 auth tests pass:
- ✅ Login sets refresh cookie and returns token
- ✅ Refresh rotates token and invalidates previous
- ✅ Logout clears cookie and blacklists token
- ✅ /me returns current user
- ✅ Login rate limit blocks excess attempts
- ✅ Audit log created for failed login
- ✅ Audit log created for refresh success
- ✅ Doctor login requires verification

### Frontend Linting
```bash
cd frontend
npm run lint
```

All linting passes with only minor warnings about imports.

## Usage Examples

### Creating First Admin

1. Set admin secret in backend environment:
```bash
export ADMIN_REGISTRATION_SECRET="my-super-secret-admin-key"
```

2. Register admin via API:
```bash
curl -X POST http://localhost:8000/api/v1/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@myapp.com",
    "password": "SecurePass123456",
    "admin_secret": "my-super-secret-admin-key"
  }'
```

3. Login via frontend at `/auth/admin/login`

### Verifying Doctors

1. Login as admin at `/auth/admin/login`
2. Navigate to `/dashboard/admin` (or get redirected automatically)
3. Click "En attente" tab to see pending doctors
4. Click ✅ to approve or ❌ to reject each doctor
5. Verified doctors appear in "Vérifiés" tab
6. Only verified doctors appear in public search

### Admin Operations

All admin operations are logged to the audit table:
- `auth.register.admin.success`
- `auth.admin.login.success`
- `admin.doctor.verified`
- `admin.doctor.unverified`

## Visual Design

### Color Schemes

**Admin** (Purple/Indigo):
- Primary: #9333EA (purple-600)
- Secondary: #4F46E5 (indigo-600)
- Hover: #7E22CE, #4338CA
- Usage: Admin login, admin dashboard, admin-specific buttons

**Doctor** (Green/Teal):
- Primary: #10B981 (green-600)
- Secondary: #14B8A6 (teal-600)
- Hover: #059669, #0D9488
- Usage: Doctor dashboard, practitioner cards

**Patient** (Blue):
- Primary: #2563EB (blue-600)
- Secondary: #10B981 (green-600)
- Hover: #1D4ED8, #059669
- Usage: Patient dashboard, patient login/register

### Typography
- Headers: Bold, 24-32px
- Body: Regular, 14-16px
- Material-UI Typography components for consistency
- Heroicons for all iconography

## Best Practices

### Security
1. **Never commit admin secret** - Use environment variables
2. **Rotate secrets regularly** in production
3. **Use HTTPS** in production for all admin operations
4. **Monitor audit logs** for suspicious admin activity
5. **Limit admin accounts** to essential personnel only

### Operations
1. **Verify doctors promptly** to maintain good UX
2. **Check clinic information** before verification
3. **Review specialties and licenses** if available
4. **Monitor metrics** via `/api/v1/metrics` (admin only)

### Development
1. **Test role-based access** in each environment
2. **Verify middleware redirects** work correctly
3. **Check token refresh** flows for each role
4. **Validate audit logging** captures all actions

## Troubleshooting

### Cannot Register Admin
- Check `ADMIN_REGISTRATION_SECRET` is set in backend env
- Verify secret matches in request body
- Check email is not already registered

### Redirect Loop
- Clear browser cookies
- Check NextAuth configuration
- Verify token includes role claim
- Check middleware matcher paths

### Admin Login Returns 403
- User may have wrong role (patient or doctor)
- Create new account with admin role
- Check backend logs for detailed error

### Dashboard Not Loading
- Check authentication token is valid
- Verify API endpoints are accessible
- Check browser console for errors
- Verify backend is running

## API Reference Summary

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/admin/register` | None | Register admin with secret |
| POST | `/auth/admin/login` | None | Login admin user |
| GET | `/admin/doctors` | Admin | List doctors (pending/verified) |
| POST | `/admin/doctors/{id}/verify` | Admin | Approve/reject doctor |
| GET | `/metrics` | Admin | System metrics |

### Parameters

**List Doctors**:
- `status`: `pending` or `verified` (default: `pending`)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Verify Doctor**:
```json
{
  "verified": true,  // or false
  "note": "Optional verification note"
}
```

## Future Enhancements

Potential improvements for future versions:
1. Admin user management (create, disable, role changes)
2. Bulk doctor verification
3. Doctor verification notes/history
4. Advanced filtering and search in admin panel
5. System health monitoring dashboard
6. Audit log viewer in admin interface
7. Notification management
8. Report generation
