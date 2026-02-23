import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as UserInsightsActions from './user-insights.actions';
import { UserInsightsService } from '../services/user-insights.service';

@Injectable()
export class UserInsightsEffects {
  private actions$ = inject(Actions);
  private userInsightsService = inject(UserInsightsService);

  loadInsights$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserInsightsActions.loadInsights),
      switchMap(() =>
        this.userInsightsService.getInsights().pipe(
          map((insights) => UserInsightsActions.loadInsightsSuccess({ insights })),
          catchError((error: Error) =>
            of(UserInsightsActions.loadInsightsFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
