import { Text, View, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Dashboard/Stats Screen
 * 
 * Features:
 * - Weekly trends chart
 * - Calendar view with activity heatmap
 * - Detailed metrics
 * - Achievement badges
 */
export default function DashboardScreen() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  const weeklyData = [
    { day: 'Mon', workouts: 2, calories: 450 },
    { day: 'Tue', workouts: 1, calories: 320 },
    { day: 'Wed', workouts: 3, calories: 580 },
    { day: 'Thu', workouts: 1, calories: 280 },
    { day: 'Fri', workouts: 2, calories: 490 },
    { day: 'Sat', workouts: 1, calories: 350 },
    { day: 'Sun', workouts: 0, calories: 0 },
  ];

  const maxCalories = Math.max(...weeklyData.map(d => d.calories));

  const achievements = [
    { id: 1, title: '7 Day Streak', icon: '🔥', unlocked: true },
    { id: 2, title: '50 Workouts', icon: '💪', unlocked: true },
    { id: 3, title: 'Level 10', icon: '⭐', unlocked: false },
    { id: 4, title: '100 Meals', icon: '🍎', unlocked: true },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-6 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Dashboard</Text>
            <Text className="text-sm text-muted mt-1">Track your progress</Text>
          </View>

          {/* Period Selector */}
          <View className="flex-row gap-2">
            {(['week', 'month', 'year'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                className={`flex-1 rounded-xl p-3 items-center ${
                  selectedPeriod === period ? 'bg-primary' : 'bg-surface'
                }`}
                style={selectedPeriod !== period ? { borderWidth: 1, borderColor: colors.border } : {}}
                activeOpacity={0.7}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text 
                  className={`font-semibold capitalize ${
                    selectedPeriod === period ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weekly Chart */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Activity This Week</Text>
            <View className="flex-row items-end justify-between h-40 gap-2">
              {weeklyData.map((data, index) => {
                const height = maxCalories > 0 ? (data.calories / maxCalories) * 100 : 0;
                return (
                  <View key={index} className="flex-1 items-center gap-2">
                    <View className="flex-1 w-full justify-end">
                      <View 
                        className="w-full rounded-t-lg"
                        style={{ 
                          height: `${height}%`,
                          backgroundColor: data.calories > 0 ? colors.primary : colors.border,
                          minHeight: data.calories > 0 ? 8 : 4
                        }}
                      />
                    </View>
                    <Text className="text-xs text-muted">{data.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Overall Stats */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Overall Stats</Text>
            <View className="gap-3">
              <View className="flex-row items-center justify-between bg-background rounded-xl p-3">
                <Text className="text-foreground">Total Workouts</Text>
                <Text className="text-foreground font-bold text-lg">127</Text>
              </View>
              <View className="flex-row items-center justify-between bg-background rounded-xl p-3">
                <Text className="text-foreground">Total Calories Burned</Text>
                <Text className="text-foreground font-bold text-lg">42,580</Text>
              </View>
              <View className="flex-row items-center justify-between bg-background rounded-xl p-3">
                <Text className="text-foreground">Meals Logged</Text>
                <Text className="text-foreground font-bold text-lg">315</Text>
              </View>
              <View className="flex-row items-center justify-between bg-background rounded-xl p-3">
                <Text className="text-foreground">Current Streak</Text>
                <Text className="text-foreground font-bold text-lg">7 days 🔥</Text>
              </View>
            </View>
          </View>

          {/* Achievements */}
          <View className="bg-surface rounded-2xl p-4 mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Achievements</Text>
            <View className="flex-row flex-wrap gap-3">
              {achievements.map((achievement) => (
                <View
                  key={achievement.id}
                  className="flex-1 min-w-[45%] bg-background rounded-xl p-4 items-center"
                  style={{ 
                    opacity: achievement.unlocked ? 1 : 0.5,
                    borderWidth: achievement.unlocked ? 2 : 1,
                    borderColor: achievement.unlocked ? colors.primary : colors.border
                  }}
                >
                  <Text className="text-4xl mb-2">{achievement.icon}</Text>
                  <Text className="text-foreground font-semibold text-center text-sm">
                    {achievement.title}
                  </Text>
                  {achievement.unlocked && (
                    <View className="absolute top-2 right-2">
                      <IconSymbol name="checkmark" size={16} color={colors.success} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
