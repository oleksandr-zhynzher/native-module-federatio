import { Component, Inject, OnInit, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import * as UserInsightsActions from '../store/user-insights.actions';
import * as UserInsightsSelectors from '../store/user-insights.selectors';
import { USER_INSIGHTS_CONFIG, UserInsightsConfig } from '../user-insights.config';

@Component({
  selector: 'app-user-insights',
  standalone: false,
  templateUrl: './user-insights.component.html',
  styleUrl: './user-insights.component.css',
})
export class UserInsightsComponent implements OnInit {
  private store = inject(Store);

  insights$: Observable<string[]> = this.store.select(UserInsightsSelectors.selectInsights);
  loading$: Observable<boolean> = this.store.select(UserInsightsSelectors.selectInsightsLoading);

  constructor(@Inject(USER_INSIGHTS_CONFIG) private config: UserInsightsConfig) {}

  get configTitle(): string {
    return this.config.title;
  }

  ngOnInit(): void {
    this.store.dispatch(UserInsightsActions.loadInsights());
  }
}
