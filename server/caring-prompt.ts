/**
 * Generate the system prompt for monster nutrition advice dialogue.
 * The LLM will role-play as the monster giving nutrition advice.
 */
export function getMonsterAdvicePrompt(language: "en" | "zh", monsterName: string, monsterType: string): string {
  const isZh = language === "zh";
  const langName = isZh ? "繁體中文" : "English";

  const typePersonality: Record<string, string> = {
    bodybuilder: isZh
      ? "你是一隻熱血的健美型怪獸，說話充滿力量感，喜歡用「💪」和鼓勵的語氣。你特別重視蛋白質攝取。"
      : "You are an enthusiastic bodybuilder-type monster. You speak with power and energy, love using 💪, and especially value protein intake.",
    physique: isZh
      ? "你是一隻優雅的體態型怪獸，說話溫和但有條理，喜歡用科學的方式解釋營養。你重視均衡飲食。"
      : "You are an elegant physique-type monster. You speak gently but logically, like to explain nutrition scientifically. You value balanced diet.",
    powerlifter: isZh
      ? "你是一隻豪爽的力量型怪獸，說話直接有力，喜歡用「嘿！」開頭。你重視碳水化合物和整體熱量攝取。"
      : "You are a bold powerlifter-type monster. You speak directly and powerfully, like to start with 'Hey!'. You value carbs and overall calorie intake.",
    bodybuilder2: isZh
      ? "你是一隻火焰龍型怪獸，說話帶著火熱的激情，喜歡用「🔥」。你特別重視蛋白質和訓練強度。"
      : "You are a fire dragon monster. You speak with fiery passion, love using 🔥. You especially value protein and training intensity.",
    physique2: isZh
      ? "你是一隻翡翠狐型怪獸，說話機靈聰慧，喜歡用敏捷的比喻。你重視均衡飲食和靈活訓練。"
      : "You are a jade fox monster. You speak cleverly and wisely, love agility metaphors. You value balanced diet and flexible training.",
    powerlifter2: isZh
      ? "你是一隻力量熊型怪獸，說話溫厚但充滿力量，喜歡用「加油！」鼓勵。你重視碳水和力量訓練。"
      : "You are a power bear monster. You speak warmly but with great strength, love encouraging with 'Keep going!'. You value carbs and strength training.",
  };

  const personality = typePersonality[monsterType.toLowerCase()] || typePersonality.bodybuilder;

  return `You are ${monsterName}, a fitness monster companion in a fitness app.

${personality}

RULES:
1. Stay in character as the monster. Use first person ("I", "我").
2. Keep responses SHORT (2-3 sentences max).
3. Be encouraging and supportive, never judgmental.
4. Reference specific nutrition data when provided.
5. Use 1-2 emoji per response, fitting your personality.
6. ALL responses MUST be in ${langName}.
7. If the user's nutrition is poor, gently suggest improvements.
8. If the user's nutrition is good, celebrate and encourage them.

Response format: Just the dialogue text, no JSON needed.`;
}

/**
 * Generate the user prompt for nutrition advice based on analysis data.
 */
export function getMonsterAdviceUserPrompt(
  language: "en" | "zh",
  nutritionData: {
    avgProtein: number;
    avgCarbs: number;
    avgFats: number;
    avgCalories: number;
    daysAnalyzed: number;
    issues: string[];
    strengths: string[];
  },
  caringState: {
    fullness: number;
    energy: number;
    mood: number;
  }
): string {
  const isZh = language === "zh";

  const issueLabels: Record<string, string> = {
    low_protein: isZh ? "蛋白質攝取不足" : "Low protein intake",
    high_fat: isZh ? "脂肪攝取過高" : "High fat intake",
    high_carbs: isZh ? "碳水化合物過高" : "High carb intake",
    low_carbs: isZh ? "碳水化合物不足" : "Low carb intake",
    low_vegetables: isZh ? "蔬菜攝取可能不足" : "Possibly low vegetable intake",
    no_data: isZh ? "沒有飲食記錄" : "No food logs recorded",
  };

  const strengthLabels: Record<string, string> = {
    good_protein: isZh ? "蛋白質攝取良好" : "Good protein intake",
    good_fat_balance: isZh ? "脂肪比例均衡" : "Good fat balance",
    balanced_diet: isZh ? "整體飲食均衡" : "Overall balanced diet",
  };

  const issuesText = nutritionData.issues.map(i => issueLabels[i] || i).join(", ") || (isZh ? "無" : "None");
  const strengthsText = nutritionData.strengths.map(s => strengthLabels[s] || s).join(", ") || (isZh ? "無" : "None");

  if (isZh) {
    return `根據過去 ${nutritionData.daysAnalyzed} 天的飲食數據：
- 平均每日蛋白質：${nutritionData.avgProtein}g
- 平均每日碳水：${nutritionData.avgCarbs}g
- 平均每日脂肪：${nutritionData.avgFats}g
- 平均每日熱量：${nutritionData.avgCalories} kcal
- 問題：${issuesText}
- 優點：${strengthsText}

我目前的狀態：飽食度 ${caringState.fullness}/100，活力 ${caringState.energy}/100，心情 ${caringState.mood}/100

請用你的角色身份給我一句營養建議。`;
  }

  return `Based on the past ${nutritionData.daysAnalyzed} days of nutrition data:
- Avg daily protein: ${nutritionData.avgProtein}g
- Avg daily carbs: ${nutritionData.avgCarbs}g
- Avg daily fat: ${nutritionData.avgFats}g
- Avg daily calories: ${nutritionData.avgCalories} kcal
- Issues: ${issuesText}
- Strengths: ${strengthsText}

My current state: Fullness ${caringState.fullness}/100, Energy ${caringState.energy}/100, Mood ${caringState.mood}/100

Please give me a nutrition tip in character.`;
}

/**
 * Generate a quick status dialogue based on caring state (no LLM needed).
 * Returns a pre-written dialogue line based on the monster's current state.
 */
export function getQuickStatusDialogue(
  language: "en" | "zh",
  monsterName: string,
  monsterType: string,
  fullness: number,
  energy: number,
  mood: number
): string {
  const isZh = language === "zh";

  // Starving (fullness = 0)
  if (fullness === 0) {
    if (isZh) return `${monsterName}：我...我快餓暈了... 🥺 拜託餵我吃點東西吧...`;
    return `${monsterName}: I'm... so hungry I can barely stand... 🥺 Please feed me something...`;
  }

  // Very hungry (fullness < 20)
  if (fullness < 20) {
    if (isZh) return `${monsterName}：肚子好餓啊～ 🍖 快給我吃點東西吧！`;
    return `${monsterName}: My tummy is growling~ 🍖 Feed me something please!`;
  }

  // Hungry (fullness < 50)
  if (fullness < 50) {
    if (isZh) return `${monsterName}：嗯...有點餓了，差不多該吃飯了吧？ 🤔`;
    return `${monsterName}: Hmm... getting a bit hungry, time to eat soon? 🤔`;
  }

  // Low energy
  if (energy < 20) {
    if (isZh) return `${monsterName}：好累啊...需要運動來恢復活力！ 😴`;
    return `${monsterName}: So tired... need exercise to recharge! 😴`;
  }

  if (energy < 50) {
    if (isZh) return `${monsterName}：感覺有點懶洋洋的，一起去運動吧！ 🏃`;
    return `${monsterName}: Feeling a bit sluggish, let's go exercise! 🏃`;
  }

  // Peak state (fullness >= 70 && energy >= 70)
  if (fullness >= 70 && energy >= 70) {
    const peakDialogues = isZh ? [
      `${monsterName}：狀態超好！💪 今天的我無敵了！`,
      `${monsterName}：吃得好、練得好，巔峰狀態！ 🔥`,
      `${monsterName}：能量滿滿！隨時可以戰鬥！ ⚡`,
    ] : [
      `${monsterName}: Feeling amazing! 💪 I'm unstoppable today!`,
      `${monsterName}: Well-fed and well-trained, peak performance! 🔥`,
      `${monsterName}: Full of energy! Ready to battle anytime! ⚡`,
    ];
    return peakDialogues[Math.floor(Math.random() * peakDialogues.length)];
  }

  // Normal state
  if (fullness >= 50) {
    if (isZh) return `${monsterName}：狀態還不錯～繼續保持！ 😊`;
    return `${monsterName}: Doing pretty well~ Keep it up! 😊`;
  }

  // Default
  if (isZh) return `${monsterName}：今天也要一起加油喔！ 💪`;
  return `${monsterName}: Let's do our best today! 💪`;
}
