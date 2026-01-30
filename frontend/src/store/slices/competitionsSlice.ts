import { createSlice } from '@reduxjs/toolkit';

interface CompetitionsState {
  competitions: any[];
  currentCompetition: any | null;
  loading: boolean;
}

const initialState: CompetitionsState = {
  competitions: [],
  currentCompetition: null,
  loading: false,
};

const competitionsSlice = createSlice({
  name: 'competitions',
  initialState,
  reducers: {},
});

export default competitionsSlice.reducer;

