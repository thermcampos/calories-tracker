import { DailyTotalCalories, FoodItem, PreWorkoutTime, RegularItem, SharedDay } from "./types";

interface AppState {
  currentHighlightIndex: number;
  searchTimeout: number | null;
  searchResults: FoodItem[];
  calendarMonthlyCalories: DailyTotalCalories[];
  isSharedView: boolean;
  sharedData: SharedDay | null;
  userTimezone: string;
  todayDateString: string;
  preWorkoutTime?: PreWorkoutTime;
  regularItems: RegularItem[];
  regularItemsLoaded: boolean;
}

export const appState: AppState = {
  currentHighlightIndex: -1,
  searchTimeout: null,
  searchResults: [],
  calendarMonthlyCalories: [],
  isSharedView: false,
  sharedData: null,
  userTimezone: '',
  todayDateString: '',
  regularItems: [],
  regularItemsLoaded: false
};
