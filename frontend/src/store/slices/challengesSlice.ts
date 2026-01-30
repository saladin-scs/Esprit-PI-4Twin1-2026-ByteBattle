import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { challengesApi } from '../../services/api';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  starterCode: string;       // <-- add this
  testCases: Array<{         // <-- add this
    input: any;
    output: any;
  }>;
  tags: string[];
  solvedCount: number;
}

interface ChallengesState {
  challenges: Challenge[];
  currentChallenge: Challenge | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChallengesState = {
  challenges: [],
  currentChallenge: null,
  loading: false,
  error: null,
};

export const fetchChallenges = createAsyncThunk(
  'challenges/fetchAll',
  async () => {
    const response = await challengesApi.getAll();
    return response.data;
  }
);

export const fetchChallenge = createAsyncThunk(
  'challenges/fetchOne',
  async (id: string) => {
    const response = await challengesApi.getOne(id);
    return response.data;
  }
);

const challengesSlice = createSlice({
  name: 'challenges',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchChallenges.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChallenges.fulfilled, (state, action) => {
        state.loading = false;
        state.challenges = action.payload;
      })
      .addCase(fetchChallenges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch challenges';
      })
      .addCase(fetchChallenge.fulfilled, (state, action) => {
        state.currentChallenge = action.payload;
      });
  },
});

export default challengesSlice.reducer;

