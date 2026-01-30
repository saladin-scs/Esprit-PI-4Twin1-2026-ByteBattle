import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import challengesReducer from './slices/challengesSlice';
import competitionsReducer from './slices/competitionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    challenges: challengesReducer,
    competitions: competitionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

