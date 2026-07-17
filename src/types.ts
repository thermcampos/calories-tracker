type FoodCategory = 'fats' | 'proteins' | 'carbs' | 'leaves' | 'fruits' | 'low carb' | 'dairy';

export type FoodItem = {
  name: string;
  nameEn: string;
  info: { calories: number, protein: number, fat: number, carbs: number, fiber: number, category: FoodCategory, alkaline: boolean, bestFor: string[] }
}

export type FoodStorage = {
  id?: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  time: string;
  date: string;
  alkaline: boolean | null;
};

export type UserSettings = {
  id?: string;
  caloriesGoal?: number;
  proteinGoal?: number;
  fatGoal?: number;
  carboGoal?: number;
  fiberGoal?: number;
  bodyWeight?: number;
  height?: number;
  bmi?: number;
  bmiResult?: string;
  goalName?: string;
  isActive?: boolean;
  timezone?: string;
  autoLoadSuggestions?: boolean;
};

export type DailyTotalCalories = {
  documentId: string;
  day: number;
  totalCalories: number;
};

export type SharedDay = {
  id?: string;
  shareId: string;
  userId: string;
  userName: string;
  date: string;
  foodEntries: string; // JSON stringified FoodStorage[]
  createdAt: string;
};

export type MealPeriod = 'pre-workout' | 'breakfast' | 'second-breakfast' | 'lunch' | 'snacks' | 'dinner' | 'night-snacks';

export type MealGroup = {
  period: MealPeriod;
  label: string;
  entries: FoodStorage[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  isExpanded: boolean;
};

export type AlternativeResult = {
  food: FoodItem;
  quantityGrams: number;
};

export type ExportInputDates = {
  start: string;
  end: string
};

export type ExportDateValidation = {
  valid: boolean;
  message: string
};
