# Authentication Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [User Registration](#user-registration)
3. [User Login](#user-login)
4. [JWT Token Management](#jwt-token-management)
5. [Token Refresh Mechanism](#token-refresh-mechanism)
6. [Protected Routes](#protected-routes)
7. [Frontend Integration](#frontend-integration)
8. [Security Considerations](#security-considerations)

---

## Overview

FinAIlytics implements a secure JWT-based authentication system with:
- Email/password registration and login
- Access tokens (15-minute expiry)
- Refresh tokens (7-day expiry)
- HTTP-only cookies for secure token storage
- Automatic token refresh on expiration

---

## User Registration

### Backend Flow

```
User submits registration form
    ↓
Validate input (Zod schema)
    ↓
Check if email already exists
    ↓
Create new user with hashed password (bcrypt)
    ↓
Create default report settings
    ↓
Return user object (password omitted)
```

### API Endpoint

**POST** `/api/auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules (Zod):**
- `name`: string, required, 1-255 characters
- `email`: valid email format, required
- `password`: string, minimum 4 characters

**Response (201):**
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": null,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### MongoDB Transaction

Registration uses MongoDB transactions to ensure data integrity:

```typescript
await session.withTransaction(async () => {
  // Create user
  await newUser.save({ session });
  // Create report settings
  await reportSetting.save({ session });
});
```

**Fallback:** If MongoDB is not a replica set, it automatically falls back to non-transactional writes.

---

## User Login

### Backend Flow

```
User submits credentials
    ↓
Validate input (Zod schema)
    ↓
Find user by email (lowercase)
    ↓
Compare password with bcrypt
    ↓
Generate JWT access token
    ↓
Return user + token + report settings
```

### API Endpoint

**POST** `/api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "User logged in successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2025-01-01T00:15:00.000Z",
  "reportSetting": {
    "_id": "...",
    "frequency": "MONTHLY",
    "isEnabled": true
  }
}
```

### Error Handling

| Error | Status | Cause |
|-------|--------|-------|
| `Email/password not found` | 404 | User doesn't exist or wrong password |
| `User already exists` | 401 | Duplicate email on register |

---

## JWT Token Management

### Token Generation

```typescript
// utils/jwt.ts
export const signJwtToken = (payload: object) => {
  const token = jwt.sign(payload, Env.JWT_SECRET, {
    expiresIn: Env.JWT_EXPIRES_IN, // 15m
  });

  const decoded = jwt.decode(token) as JwtPayload;
  return {
    token,
    expiresAt: new Date(decoded.exp! * 1000),
  };
};
```

### Token Structure

**Access Token:**
- Algorithm: HS256
- Payload: `{ userId: string, iat: number, exp: number }`
- Expiry: 15 minutes

### Passport JWT Strategy

```typescript
// config/passport.config.ts
passport.use(
  'jwt',
  new JwtStrategy(opts, async (payload, done) => {
    try {
      const user = await UserModel.findById(payload.userId);
      if (!user) return done(null, false);
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

export const passportAuthenticateJwt = passport.authenticate('jwt', {
  session: false,
});
```

---

## Token Refresh Mechanism

### Frontend Implementation

The frontend uses a custom hook to monitor token expiration:

```typescript
// hooks/use-auth-expiration.ts
export const useAuthExpiration = () => {
  const { expiresAt, logout } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!expiresAt) return;

    const checkExpiration = () => {
      if (new Date() >= new Date(expiresAt)) {
        logout(); // or trigger refresh
      }
    };

    const interval = setInterval(checkExpiration, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [expiresAt, logout]);
};
```

### RTK Query Integration

All API requests automatically include the access token:

```typescript
// app/api-client.ts
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include", // Allows cookies
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});
```

---

## Protected Routes

### Backend Middleware

All protected routes use `passportAuthenticateJwt` middleware:

```typescript
// index.ts
app.use(`${BASE_PATH}/user`, passportAuthenticateJwt, userRoutes);
app.use(`${BASE_PATH}/transaction`, passportAuthenticateJwt, transactionRoutes);
app.use(`${BASE_PATH}/report`, passportAuthenticateJwt, reportRoutes);
app.use(`${BASE_PATH}/analytics`, passportAuthenticateJwt, analyticsRoutes);
```

### Frontend Routes

```typescript
// routes/index.tsx
<Route element={<ProtectedRoute />}>
  <Route element={<AppLayout />}>
    {protectedRoutePaths.map((route) => (
      <Route key={route.path} path={route.path} element={route.element} />
    ))}
  </Route>
</Route>
```

```typescript
// routes/protectedRoute.tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};
```

---

## Frontend Integration

### Auth Slice

```typescript
// features/auth/authSlice.ts
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    expiresAt: null,
    isAuthenticated: false,
    reportSetting: null,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.expiresAt = action.payload.expiresAt;
      state.reportSetting = action.payload.reportSetting;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.expiresAt = null;
      state.isAuthenticated = false;
      state.reportSetting = null;
    },
  },
});
```

### Auth API

```typescript
// features/auth/authAPI.ts
export const authApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});
```

### Login Flow

1. User enters credentials
2. Call `useLoginMutation`
3. On success, dispatch `setCredentials` with response data
4. Redirect to dashboard

---

## Security Considerations

### Password Security

- **Hashing:** bcrypt with salt
- **Storage:** Never stored in plain text
- **Comparison:** Uses bcrypt.compare()

```typescript
// models/user.model.ts
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await hashValue(this.password);
  }
  next();
});
```

### Token Security

- **Short-lived access tokens** (15 min) - Limits damage if compromised
- **Long-lived refresh tokens** (7 days) - Stored in HTTP-only cookie
- **Algorithm:** HS256 - Symmetric signing

### CORS Configuration

```typescript
app.use(cors({
  origin: Env.FRONTEND_ORIGIN, // Only allowed origin
  credentials: true, // Allow cookies
}));
```

### Best Practices

1. **Environment variables** for all secrets
2. **HTTPS** in production
3. **Secure cookies** settings
4. **Input validation** with Zod
5. **Rate limiting** recommended for production

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         REGISTRATION FLOW                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Client                    Server                  Database          │
│    │                         │                       │              │
│    ├─── POST /auth/register ──►                       │              │
│    │                         │                       │              │
│    │                    Validate input               │              │
│    │                         │                       │              │
│    │                    Check existing              │              │
│    │                         │                       │              │
│    │                Hash password (bcrypt)          │              │
│    │                         │                       │              │
│    │                   Create user ──────────────►  │              │
│    │                         │                       │              │
│    │               Create report settings ──────────►            │
│    │                         │                       │              │
│    │◄──── 201 Created ───────┤                       │              │
│    │                         │                       │              │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Client                    Server                  Database          │
│    │                         │                       │              │
│    ├─── POST /auth/login ────►                       │              │
│    │                         │                       │              │
│    │                   Validate input               │              │
│    │                         │                       │              │
│    │               Find user by email ─────────────►│              │
│    │                         │                       │              │
│    │               Compare password ───────────────►│              │
│    │                         │                       │              │
│    │              Generate JWT token                 │              │
│    │                         │                       │              │
│    │◄──── 200 OK + token ────┤                       │              │
│    │                         │                       │              │
│    │              Store token in Redux               │              │
│    │                         │                       │              │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      PROTECTED REQUEST FLOW                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Client                    Server                  Database          │
│    │                         │                       │              │
│    ├─── GET /transaction/all ──►                     │              │
│    │    (with Bearer token)   │                       │              │
│    │                         │                       │              │
│    │              Verify JWT token                   │              │
│    │                         │                       │              │
│    │              Extract user ID                    │              │
│    │                         │                       │              │
│    │              Query transactions ─────────────►│              │
│    │                         │                       │              │
│    │◄──── 200 OK + data ─────┤                       │              │
│    │                         │                       │              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```env
# Backend
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
VITE_API_URL=http://localhost:8000/api
```

---

## Notes

- Email addresses are normalized to lowercase
- Passwords must be at least 4 characters
- Tokens are validated on every protected request
- Failed authentication returns generic "Email/password not found" to prevent user enumeration
- Session data is not stored on server (stateless JWT)