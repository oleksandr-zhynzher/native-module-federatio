import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserInsightsState } from './user-insights.reducer';

export const selectUserInsightsState =
  createFeatureSelector<UserInsightsState>('userInsights');

export const selectInsights = createSelector(
  selectUserInsightsState,
  (state) => state.insights
);

export const selectInsightsLoading = createSelector(
  selectUserInsightsState,
  (state) => state.loading
);

export const selectInsightsError = createSelector(
  selectUserInsightsState,
  (state) => state.error
);
