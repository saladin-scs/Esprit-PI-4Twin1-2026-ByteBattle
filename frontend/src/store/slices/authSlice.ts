import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, usersApi } from '../../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  roles?: string[];
  displayName?: string;
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
  async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    const response = await authApi.login(credentials);
    if (!response.data?.twoFactorRequired) {
      localStorage.setItem('token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
    }
    return response.data;
  }
);

export const verify2faLogin = createAsyncThunk(
  'auth/verify2faLogin',
  async (data: { twoFactorToken: string; code: string; rememberMe?: boolean }) => {
    const response = await authApi.verify2faLogin(data);
    localStorage.setItem('token', response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    return response.data;
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; username: string; password: string }) => {
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
  }
);

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const response = await usersApi.me();
  return response.data;
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
          state.user = action.payload.user || null;
          state.isAuthenticated = false;
          state.token = null;
        } else {
          state.twoFactorRequired = false;
          state.twoFactorToken = null;
          state.user = action.payload.user;
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token || state.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      .addCase(verify2faLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2faLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.twoFactorRequired = false;
        state.twoFactorToken = null;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || state.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(verify2faLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '2FA verification failed';
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user ?? null;
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
        state.error = action.error.message || 'Registration failed';
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          // Backend returns _id for mongoose docs; normalize
          const u = action.payload;
          state.user = {
            id: u._id || u.id,
            email: u.email,
            username: u.username,
            roles: u.roles || (u.isAdmin ? ['admin'] : ['user']),
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            emailVerifiedAt: u.emailVerifiedAt || null,
            twoFactorEnabled: u.twoFactorEnabled || false,
          };
          state.isAuthenticated = true;
        }
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      });
  },
});

export const { logout, setUser, complete2faSetup } = authSlice.actions;
export default authSlice.reducer;

