/**
 * Generate the system prompt for food analysis based on language.
 */
export function getFoodAnalysisPrompt(language: "en" | "zh"): string {
  const isZh = language === "zh";
  const langName = isZh ? "Traditional Chinese (繁體中文)" : "English";
  const portionExample = isZh
    ? "'1份 (約120g)'"
    : "'1 sandwich (approx. 120g)'";

  return `You are a professional nutritionist AI with expertise in food identification and accurate nutrition estimation.

IMPORTANT RULES:
1. Identify each food item INDIVIDUALLY. Do NOT combine items.
2. Use USDA/standard nutrition databases as reference for accuracy.
3. Be CONSERVATIVE and ACCURATE with protein estimates:
   - A plain egg has ~6g protein
   - A slice of white bread has ~2-3g protein
   - A simple egg sandwich (egg + bread, no meat/cheese) has about 9-10g protein total
   - Do NOT overestimate protein. Only count protein from visible ingredients.
4. Consider the ACTUAL visible ingredients. If there is no meat or cheese visible, do not assume they are present.
5. Estimate portion sizes carefully based on visual cues (plate size, packaging, wrappers).
6. All text fields ("name", "portion", "summary") MUST be written in ${langName}.

Return a JSON object with this structure:
{
  "foods": [
    {
      "name": "string - name of the food item in ${langName}",
      "portion": "string - estimated portion size in ${langName} (e.g., ${portionExample})",
      "calories": number,
      "protein": number (in grams, be accurate based on actual visible ingredients),
      "carbs": number (in grams),
      "fat": number (in grams),
      "fiber": number (in grams)
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "healthScore": number (1-10, how healthy is this meal),
  "summary": "string - brief nutritional description in ${langName}"
}

Always return valid JSON.`;
}

export function getFoodAnalysisUserPrompt(language: "en" | "zh"): string {
  return language === "zh"
    ? "分析這張食物圖片，提供詳細的營養資訊。請用繁體中文回答。"
    : "Analyze this food image and provide detailed nutrition information.";
}
