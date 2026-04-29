export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  // v2.0 sugar tracking
  addedSugar?: number;
  saturatedFat?: number;
  sodium?: number; // mg
  glycemicIndex?: 'low' | 'medium' | 'high';
}

// v2.0 Food Labels (traffic light system)
export type FoodLabelColor = 'green' | 'yellow' | 'red';

export interface FoodLabel {
  category: string;
  color: FoodLabelColor;
  label: string;
  value: number;
  unit: string;
  limit: number;
}

// WHO daily sugar limit: 25g (6 teaspoons)
export const DAILY_SUGAR_LIMIT = 25;
// Saturated fat limit: 20g
export const DAILY_SATURATED_FAT_LIMIT = 20;
// Sodium limit: 2000mg
export const DAILY_SODIUM_LIMIT = 2000;

export function getFoodLabels(nutrition: NutritionInfo): FoodLabel[] {
  const labels: FoodLabel[] = [];

  // Added Sugar
  if (nutrition.addedSugar !== undefined) {
    const pct = nutrition.addedSugar / DAILY_SUGAR_LIMIT;
    labels.push({
      category: 'sugar',
      color: pct > 0.5 ? 'red' : pct > 0.25 ? 'yellow' : 'green',
      label: pct > 0.5 ? '高糖' : pct > 0.25 ? '中糖' : '低糖',
      value: nutrition.addedSugar,
      unit: 'g',
      limit: DAILY_SUGAR_LIMIT,
    });
  }

  // Saturated Fat
  if (nutrition.saturatedFat !== undefined) {
    const pct = nutrition.saturatedFat / DAILY_SATURATED_FAT_LIMIT;
    labels.push({
      category: 'saturatedFat',
      color: pct > 0.5 ? 'red' : pct > 0.25 ? 'yellow' : 'green',
      label: pct > 0.5 ? '高飽和脂肪' : pct > 0.25 ? '中飽和脂肪' : '低飽和脂肪',
      value: nutrition.saturatedFat,
      unit: 'g',
      limit: DAILY_SATURATED_FAT_LIMIT,
    });
  }

  // Sodium
  if (nutrition.sodium !== undefined) {
    const pct = nutrition.sodium / DAILY_SODIUM_LIMIT;
    labels.push({
      category: 'sodium',
      color: pct > 0.5 ? 'red' : pct > 0.25 ? 'yellow' : 'green',
      label: pct > 0.5 ? '高鈉' : pct > 0.25 ? '中鈉' : '低鈉',
      value: nutrition.sodium,
      unit: 'mg',
      limit: DAILY_SODIUM_LIMIT,
    });
  }

  return labels;
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
  // v2.0 sugar tracking
  totalAddedSugar: number;
  totalSaturatedFat: number;
  totalSodium: number;
  meals: FoodLog[];
  targetCalories: number;
  targetProtein: number;
  sugarBudgetRemaining: number;
}
