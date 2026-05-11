<<<<<<< HEAD
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, usersApi } from '../../services/api';

// Expanded User interface to match backend schema
export interface User {
  id: string;
  email: string;
  username: string;
  roles?: string[];
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  coverImage?: string;
  links?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    portfolio?: string;
  };
  profilePublic?: boolean;
  preferences?: {
    preferredLanguage?: string;
    theme?: 'light' | 'dark';
    notifications?: {
      email?: boolean;
      product?: boolean;
    };
  };
  emailVerifiedAt?: string | null;
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  twoFactorRequired: boolean;
  twoFactorToken: string | null;
  twoFactorSetupRequired: boolean;
  setupToken: string | null;
  loading: boolean;
  error: string | null;
}

/** Nest validation / HTTP errors often land in `response.data.message` (string or string[]). */
function messageFromAxiosError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string | string[] } };
    message?: string;
  };
  const raw = e.response?.data?.message;
  if (Array.isArray(raw)) return raw.map(String).join(', ');
  if (typeof raw === 'string' && raw.trim()) return raw;
  const status = e.response?.status;
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return 'Access denied.';
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (!e.response) return 'Cannot reach the API. Start the backend (port 3000) and ensure MongoDB is running.';
  return e.message || 'Request failed';
}

function normalizeApiUser(u: {
  id?: string;
  _id?: string;
  email?: string;
  username?: string;
  roles?: string[];
  isAdmin?: boolean;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerifiedAt?: string | null;
  twoFactorEnabled?: boolean;
} | null): User | null {
  if (!u) return null;
  const id = u.id ?? u._id;
  if (id == null || id === '') return null;
  return {
    id: String(id),
    email: u.email ?? '',
    username: u.username ?? '',
    roles: u.roles?.length ? u.roles : u.isAdmin ? ['admin'] : ['user'],
    displayName: u.displayName,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    emailVerifiedAt: u.emailVerifiedAt ?? null,
    twoFactorEnabled: u.twoFactorEnabled ?? false,
  };
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('token'),
  twoFactorRequired: false,
  twoFactorToken: null,
  twoFactorSetupRequired: false,
  setupToken: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      if (!response.data?.twoFactorRequired) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);
export const faceLogin = createAsyncThunk(
  'auth/faceLogin',
  async (data: { email: string; embedding: number[]; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authApi.faceLogin(data);
      if (response.data?.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);
export const verify2faLogin = createAsyncThunk(
  'auth/verify2faLogin',
  async (data: { twoFactorToken: string; code: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authApi.verify2faLogin(data);
      localStorage.setItem('token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    userData: {
      email: string;
      username: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: string;
      newsletter?: boolean;
      referralSource?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await authApi.register(userData);
      if (response.data.twoFactorSetupRequired && response.data.setupToken) {
        localStorage.setItem('token', response.data.setupToken);
      } else if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);

type FetchMeRejected = { unauthorized: boolean; message: string };

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const response = await usersApi.me();
    return response.data;
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    const payload: FetchMeRejected = {
      unauthorized: status === 401,
      message: messageFromAxiosError(err),
    };
    return rejectWithValue(payload);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.twoFactorSetupRequired = false;
      state.setupToken = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    complete2faSetup: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string; user: User }>,
    ) => {
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.twoFactorSetupRequired = false;
      state.setupToken = null;
      localStorage.setItem('token', action.payload.access_token);
      localStorage.setItem('refresh_token', action.payload.refresh_token);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.twoFactorRequired) {
          state.twoFactorRequired = true;
          state.twoFactorToken = action.payload.twoFactorToken;
          state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
          state.isAuthenticated = false;
          state.token = null;
        } else {
          state.twoFactorRequired = false;
          state.twoFactorToken = null;
          state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token || state.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Login failed';
      })
      .addCase(faceLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(faceLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user ?? null;
        state.token = action.payload?.access_token ?? null;
        state.refreshToken = action.payload?.refresh_token ?? state.refreshToken;
        state.isAuthenticated = !!action.payload?.access_token;
      })
      .addCase(faceLogin.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Face login failed';
      })
      .addCase(verify2faLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2faLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.twoFactorRequired = false;
        state.twoFactorToken = null;
        state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || state.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(verify2faLogin.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          '2FA verification failed';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
        if (action.payload.twoFactorSetupRequired && action.payload.setupToken) {
          state.twoFactorSetupRequired = true;
          state.setupToken = action.payload.setupToken;
          state.token = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
        } else {
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token || state.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Registration failed';
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const u = action.payload as Parameters<typeof normalizeApiUser>[0];
          state.user = normalizeApiUser(u);
          state.isAuthenticated = true;
        }
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        const p = action.payload as FetchMeRejected | undefined;
        if (p?.unauthorized) {
          state.token = null;
          state.refreshToken = null;
          state.user = null;
          state.isAuthenticated = false;
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
        }
        state.error = p?.message || action.error.message || 'Failed to fetch profile';
      });
  },
});

export const { logout, setUser, complete2faSetup } = authSlice.actions;
export default authSlice.reducer;

/** Message from `dispatch(thunk()).unwrap()` when thunk used `rejectWithValue`. */
export function unwrapRejectedMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'payload' in err) {
    const p = (err as { payload: unknown }).payload;
    if (typeof p === 'string') return p;
    if (Array.isArray(p)) return p.map(String).join(', ');
    if (p && typeof p === 'object' && typeof (p as { message?: string }).message === 'string') {
      return (p as { message: string }).message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

=======
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, usersApi } from '../../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  roles?: string[];
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerifiedAt?: string | null;
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  twoFactorRequired: boolean;
  twoFactorToken: string | null;
  twoFactorSetupRequired: boolean;
  setupToken: string | null;
  loading: boolean;
  error: string | null;
}

/** Nest validation / HTTP errors often land in `response.data.message` (string or string[]). */
function messageFromAxiosError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string | string[] } };
    message?: string;
  };
  const raw = e.response?.data?.message;
  if (Array.isArray(raw)) return raw.map(String).join(', ');
  if (typeof raw === 'string' && raw.trim()) return raw;
  const status = e.response?.status;
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return 'Access denied.';
  if (status === 429) return 'Too many attempts. Wait a moment and try again.';
  if (!e.response) return 'Cannot reach the API. Start the backend (port 3000) and ensure MongoDB is running.';
  return e.message || 'Request failed';
}

function normalizeApiUser(u: {
  id?: string;
  _id?: string;
  email?: string;
  username?: string;
  roles?: string[];
  isAdmin?: boolean;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerifiedAt?: string | null;
  twoFactorEnabled?: boolean;
} | null): User | null {
  if (!u) return null;
  const id = u.id ?? u._id;
  if (id == null || id === '') return null;
  return {
    id: String(id),
    email: u.email ?? '',
    username: u.username ?? '',
    roles: u.roles?.length ? u.roles : u.isAdmin ? ['admin'] : ['user'],
    displayName: u.displayName,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    emailVerifiedAt: u.emailVerifiedAt ?? null,
    twoFactorEnabled: u.twoFactorEnabled ?? false,
  };
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('token'),
  twoFactorRequired: false,
  twoFactorToken: null,
  twoFactorSetupRequired: false,
  setupToken: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      if (!response.data?.twoFactorRequired) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);
export const faceLogin = createAsyncThunk(
  'auth/faceLogin',
  async (data: { email: string; embedding: number[]; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authApi.faceLogin(data);
      if (response.data?.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);
export const verify2faLogin = createAsyncThunk(
  'auth/verify2faLogin',
  async (data: { twoFactorToken: string; code: string; rememberMe?: boolean }, { rejectWithValue }) => {
    try {
      const response = await authApi.verify2faLogin(data);
      localStorage.setItem('token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    userData: {
      email: string;
      username: string;
      password: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: string;
      newsletter?: boolean;
      referralSource?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await authApi.register(userData);
      if (response.data.twoFactorSetupRequired && response.data.setupToken) {
        localStorage.setItem('token', response.data.setupToken);
      } else if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(messageFromAxiosError(err));
    }
  },
);

type FetchMeRejected = { unauthorized: boolean; message: string };

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const response = await usersApi.me();
    return response.data;
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    const payload: FetchMeRejected = {
      unauthorized: status === 401,
      message: messageFromAxiosError(err),
    };
    return rejectWithValue(payload);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.twoFactorSetupRequired = false;
      state.setupToken = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    complete2faSetup: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string; user: User }>,
    ) => {
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.twoFactorSetupRequired = false;
      state.setupToken = null;
      localStorage.setItem('token', action.payload.access_token);
      localStorage.setItem('refresh_token', action.payload.refresh_token);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.twoFactorRequired) {
          state.twoFactorRequired = true;
          state.twoFactorToken = action.payload.twoFactorToken;
          state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
          state.isAuthenticated = false;
          state.token = null;
        } else {
          state.twoFactorRequired = false;
          state.twoFactorToken = null;
          state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token || state.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Login failed';
      })
      .addCase(faceLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(faceLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user ?? null;
        state.token = action.payload?.access_token ?? null;
        state.refreshToken = action.payload?.refresh_token ?? state.refreshToken;
        state.isAuthenticated = !!action.payload?.access_token;
      })
      .addCase(faceLogin.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Face login failed';
      })
      .addCase(verify2faLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2faLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.twoFactorRequired = false;
        state.twoFactorToken = null;
        state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || state.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(verify2faLogin.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          '2FA verification failed';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = normalizeApiUser(action.payload.user as Parameters<typeof normalizeApiUser>[0]);
        if (action.payload.twoFactorSetupRequired && action.payload.setupToken) {
          state.twoFactorSetupRequired = true;
          state.setupToken = action.payload.setupToken;
          state.token = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
        } else {
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token || state.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (typeof action.payload === 'string' ? action.payload : null) ||
          action.error.message ||
          'Registration failed';
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const u = action.payload as Parameters<typeof normalizeApiUser>[0];
          state.user = normalizeApiUser(u);
          state.isAuthenticated = true;
        }
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        const p = action.payload as FetchMeRejected | undefined;
        if (p?.unauthorized) {
          state.token = null;
          state.refreshToken = null;
          state.user = null;
          state.isAuthenticated = false;
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
        }
        state.error = p?.message || action.error.message || 'Failed to fetch profile';
      });
  },
});

export const { logout, setUser, complete2faSetup } = authSlice.actions;
export default authSlice.reducer;

/** Message from `dispatch(thunk()).unwrap()` when thunk used `rejectWithValue`. */
export function unwrapRejectedMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'payload' in err) {
    const p = (err as { payload: unknown }).payload;
    if (typeof p === 'string') return p;
    if (Array.isArray(p)) return p.map(String).join(', ');
    if (p && typeof p === 'object' && typeof (p as { message?: string }).message === 'string') {
      return (p as { message: string }).message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

>>>>>>> origin/saladin
