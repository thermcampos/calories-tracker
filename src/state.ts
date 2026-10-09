import { DailyTotalCalories, FoodItem, PreWorkoutTime, SharedDay } from "./types";

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
}

export const appState: AppState = {
  currentHighlightIndex: -1,
  searchTimeout: null,
  searchResults: [],
  calendarMonthlyCalories: [],
  isSharedView: false,
  sharedData: null,
  userTimezone: '',
  todayDateString: ''
};
