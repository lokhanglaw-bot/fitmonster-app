import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import type { Monster } from "@/types/game";

/**
 * Home Screen - Monster Display and Daily Stats
 * 
 * Main dashboard showing:
 * - User's monster with current state
 * - Daily activity stats
 * - Quick action buttons
 * - Daily quests
 */
export default function HomeScreen() {
  const colors = useColors();
  const [monster, setMonster] = useState<Monster>({
    id: "1",
    name: "Fitmon",
    type: "bodybuilder",
    stage: 1,
    level: 5,
    xp: 250,
    health: 80,
    maxHealth: 100,
    happiness: 90,
    strength: 15,
    agility: 10,
    endurance: 12,
    imageUrl: require("@/assets/monsters/bodybuilder-stage1.png"),
  });

  const [dailyStats, setDailyStats] = useState({
    steps: 5234,
    calories: 450,
    workouts: 1,
    meals: 2,
    streak: 7,
  });

  const xpProgress = (monster.xp / 500) * 100; // 500 XP per level
  const healthProgress = (monster.health / monster.maxHealth) * 100;

  return (
    <ScreenContainer className="bg-gradient-to-b from-primary/10 to-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="flex-1 px-6 pt-6 gap-6">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-foreground">{monster.name}</Text>
              <Text className="text-sm text-muted">Level {monster.level} {monster.type}</Text>
            </View>
            <TouchableOpacity 
              className="bg-surface rounded-full p-3"
              style={{ borderWidth: 1, borderColor: colors.border }}
            >
              <IconSymbol name="gear" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Monster Display */}
          <View className="items-center py-8">
            <View className="relative">
              <Image
                source={monster.imageUrl}
                style={{ width: 280, height: 280 }}
                contentFit="contain"
              />
              {/* Health Bar */}
              <View className="absolute -bottom-4 left-0 right-0 px-8">
                <View className="bg-surface rounded-full h-6 overflow-hidden" style={{ borderWidth: 2, borderColor: colors.border }}>
                  <View 
                    className="bg-success h-full rounded-full"
                    style={{ width: `${healthProgress}%` }}
                  />
                </View>
                <Text className="text-xs text-center text-muted mt-1">
                  {monster.health}/{monster.maxHealth} HP
                </Text>
              </View>
            </View>
          </View>

          {/* XP Progress */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-foreground">Experience</Text>
              <Text className="text-xs text-muted">{monster.xp}/500 XP</Text>
            </View>
            <View className="bg-background rounded-full h-3 overflow-hidden">
              <View 
                className="h-full rounded-full"
                style={{ width: `${xpProgress}%`, backgroundColor: '#8B5CF6' }}
              />
            </View>
          </View>

          {/* Daily Stats */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Today's Activity</Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-1 min-w-[45%] bg-background rounded-xl p-3">
                <Text className="text-2xl font-bold text-foreground">{dailyStats.steps}</Text>
                <Text className="text-xs text-muted">Steps</Text>
              </View>
              <View className="flex-1 min-w-[45%] bg-background rounded-xl p-3">
                <Text className="text-2xl font-bold text-foreground">{dailyStats.calories}</Text>
                <Text className="text-xs text-muted">Calories</Text>
              </View>
              <View className="flex-1 min-w-[45%] bg-background rounded-xl p-3">
                <Text className="text-2xl font-bold text-foreground">{dailyStats.workouts}</Text>
                <Text className="text-xs text-muted">Workouts</Text>
              </View>
              <View className="flex-1 min-w-[45%] bg-background rounded-xl p-3">
                <Text className="text-2xl font-bold text-foreground">{dailyStats.meals}</Text>
                <Text className="text-xs text-muted">Meals Logged</Text>
              </View>
            </View>
          </View>

          {/* Streak Badge */}
          <View className="bg-warning/20 rounded-2xl p-4 items-center" style={{ borderWidth: 1, borderColor: colors.warning }}>
            <Text className="text-3xl font-bold text-warning">🔥 {dailyStats.streak} Day Streak!</Text>
            <Text className="text-sm text-muted mt-1">Keep it up!</Text>
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-3">
            <TouchableOpacity 
              className="flex-1 bg-primary rounded-xl p-4 items-center"
              activeOpacity={0.7}
            >
              <IconSymbol name="camera.fill" size={28} color="#ffffff" />
              <Text className="text-white font-semibold mt-2">Log Food</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 bg-primary rounded-xl p-4 items-center"
              activeOpacity={0.7}
            >
              <IconSymbol name="dumbbell.fill" size={28} color="#ffffff" />
              <Text className="text-white font-semibold mt-2">Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
