export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  nutrition: NutritionInfo;
  servingSize: string;
  imageUrl?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  foodItem: FoodItem;
  quantity: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  totalNutrition: NutritionInfo;
  imageUrl?: string;
  notes?: string;
  createdAt: Date;
}

export interface DailyNutrition {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: FoodLog[];
  targetCalories: number;
  targetProtein: number;
}
