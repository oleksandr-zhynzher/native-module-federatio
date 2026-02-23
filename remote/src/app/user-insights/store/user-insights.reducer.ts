import { createReducer, on } from '@ngrx/store';
import * as UserInsightsActions from './user-insights.actions';

export interface UserInsightsState {
  insights: string[];
  loading: boolean;
  error: string | null;
}

const initialState: UserInsightsState = {
  insights: [],
  loading: false,
  error: null,
};

export const userInsightsReducer = createReducer(
  initialState,
  on(UserInsightsActions.loadInsights, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(UserInsightsActions.loadInsightsSuccess, (state, { insights }) => ({
    ...state,
    insights,
    loading: false,
  })),
  on(UserInsightsActions.loadInsightsFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  }))
);
