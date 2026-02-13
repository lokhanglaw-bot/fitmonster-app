import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Workout Tracker Screen
 * 
 * Features:
 * - Exercise selection
 * - Workout timer
 * - Progress tracking
 * - Workout history
 */
export default function WorkoutScreen() {
  const colors = useColors();
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);

  const workoutCategories = [
    { id: 'strength', name: 'Strength', icon: 'dumbbell.fill', color: '#EF4444' },
    { id: 'cardio', name: 'Cardio', icon: 'bolt.fill', color: '#F59E0B' },
    { id: 'flexibility', name: 'Flexibility', icon: 'person.fill', color: '#22C55E' },
    { id: 'sports', name: 'Sports', icon: 'bolt.fill', color: '#3B82F6' },
  ];

  const recentWorkouts = [
    { name: 'Bench Press', sets: 4, reps: 10, weight: 80, time: '2 hours ago' },
    { name: 'Running', duration: 30, distance: 5, time: 'Yesterday' },
    { name: 'Squats', sets: 3, reps: 12, weight: 100, time: '2 days ago' },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-6 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Workout</Text>
            <Text className="text-sm text-muted mt-1">Train your monster and gain XP</Text>
          </View>

          {/* Active Workout Timer */}
          {activeWorkout && (
            <View className="bg-primary rounded-3xl p-6 items-center">
              <Text className="text-white text-lg font-semibold mb-2">Workout in Progress</Text>
              <Text className="text-white text-5xl font-bold">15:32</Text>
              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity 
                  className="bg-white/20 rounded-xl px-6 py-3"
                  activeOpacity={0.7}
                  onPress={() => setActiveWorkout(null)}
                >
                  <Text className="text-white font-semibold">Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="bg-white rounded-xl px-6 py-3"
                  activeOpacity={0.7}
                  onPress={() => setActiveWorkout(null)}
                >
                  <Text className="text-primary font-semibold">Finish</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Workout Categories */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Choose Workout Type</Text>
            <View className="flex-row flex-wrap gap-3">
              {workoutCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  className="flex-1 min-w-[45%] bg-background rounded-xl p-4 items-center"
                  activeOpacity={0.7}
                  onPress={() => setActiveWorkout(category.id)}
                >
                  <View 
                    className="rounded-full p-3 mb-2"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconSymbol name={category.icon as any} size={28} color={category.color} />
                  </View>
                  <Text className="text-foreground font-semibold">{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Start Exercises */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-3">Popular Exercises</Text>
            <View className="gap-2">
              {['Push-ups', 'Squats', 'Plank', 'Jumping Jacks'].map((exercise) => (
                <TouchableOpacity
                  key={exercise}
                  className="bg-background rounded-xl px-4 py-3 flex-row items-center justify-between"
                  activeOpacity={0.7}
                >
                  <Text className="text-foreground font-medium">{exercise}</Text>
                  <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Workouts */}
          <View className="bg-surface rounded-2xl p-4 mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-3">Recent Workouts</Text>
            <View className="gap-3">
              {recentWorkouts.map((workout, index) => (
                <View key={index} className="bg-background rounded-xl p-3">
                  <Text className="text-foreground font-semibold">{workout.name}</Text>
                  <Text className="text-xs text-muted mt-1">
                    {workout.sets && `${workout.sets} sets × ${workout.reps} reps`}
                    {workout.weight && ` • ${workout.weight}kg`}
                    {workout.duration && `${workout.duration} min`}
                    {workout.distance && ` • ${workout.distance}km`}
                    {` • ${workout.time}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
