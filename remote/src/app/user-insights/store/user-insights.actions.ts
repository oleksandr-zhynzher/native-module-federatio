import { createAction, props } from '@ngrx/store';

export const loadInsights = createAction('[User Insights] Load Insights');
export const loadInsightsSuccess = createAction(
  '[User Insights] Load Insights Success',
  props<{ insights: string[] }>()
);
export const loadInsightsFailure = createAction(
  '[User Insights] Load Insights Failure',
  props<{ error: string }>()
);
