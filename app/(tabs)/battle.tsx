import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Battle Arena Screen
 * 
 * Features:
 * - Matchmaking with other players
 * - Battle interface
 * - Battle history
 * - Leaderboards
 */
export default function BattleScreen() {
  const colors = useColors();
  const [inBattle, setInBattle] = useState(false);

  const leaderboard = [
    { rank: 1, name: 'FitChamp', wins: 156, monster: 'Bodybuilder Lv.25' },
    { rank: 2, name: 'GymRat', wins: 142, monster: 'Powerlifter Lv.23' },
    { rank: 3, name: 'HealthHero', wins: 128, monster: 'Physique Lv.22' },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-6 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Battle Arena</Text>
            <Text className="text-sm text-muted mt-1">Challenge other trainers</Text>
          </View>

          {/* Battle Stats */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Your Record</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-success/20 rounded-xl p-4 items-center" style={{ borderWidth: 1, borderColor: colors.success }}>
                <Text className="text-3xl font-bold text-success">24</Text>
                <Text className="text-sm text-muted mt-1">Wins</Text>
              </View>
              <View className="flex-1 bg-error/20 rounded-xl p-4 items-center" style={{ borderWidth: 1, borderColor: colors.error }}>
                <Text className="text-3xl font-bold text-error">8</Text>
                <Text className="text-sm text-muted mt-1">Losses</Text>
              </View>
              <View className="flex-1 bg-primary/20 rounded-xl p-4 items-center" style={{ borderWidth: 1, borderColor: colors.primary }}>
                <Text className="text-3xl font-bold text-primary">75%</Text>
                <Text className="text-sm text-muted mt-1">Win Rate</Text>
              </View>
            </View>
          </View>

          {/* Find Match Button */}
          <TouchableOpacity 
            className="bg-primary rounded-3xl p-6 items-center"
            activeOpacity={0.7}
            onPress={() => setInBattle(!inBattle)}
          >
            <IconSymbol name="bolt.fill" size={32} color="#ffffff" />
            <Text className="text-white text-xl font-bold mt-2">
              {inBattle ? "Cancel Match" : "Find Match"}
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              {inBattle ? "Searching for opponent..." : "Battle with random trainer"}
            </Text>
          </TouchableOpacity>

          {/* Battle Preview */}
          {inBattle && (
            <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-lg font-bold text-foreground mb-4 text-center">Match Found!</Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 items-center">
                  <View className="bg-background rounded-2xl p-4 w-full items-center">
                    <Image
                      source={require("@/assets/monsters/bodybuilder-stage1.png")}
                      style={{ width: 100, height: 100 }}
                      contentFit="contain"
                    />
                    <Text className="text-foreground font-bold mt-2">Your Monster</Text>
                    <Text className="text-xs text-muted">Lv.5 Bodybuilder</Text>
                  </View>
                </View>
                <View className="px-4">
                  <Text className="text-3xl">⚔️</Text>
                </View>
                <View className="flex-1 items-center">
                  <View className="bg-background rounded-2xl p-4 w-full items-center">
                    <Image
                      source={require("@/assets/monsters/powerlifter-stage1.png")}
                      style={{ width: 100, height: 100 }}
                      contentFit="contain"
                    />
                    <Text className="text-foreground font-bold mt-2">Opponent</Text>
                    <Text className="text-xs text-muted">Lv.6 Powerlifter</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity 
                className="bg-error rounded-xl p-4 items-center mt-4"
                activeOpacity={0.7}
              >
                <Text className="text-white font-bold">Start Battle!</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Leaderboard */}
          <View className="bg-surface rounded-2xl p-4 mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-4">Leaderboard</Text>
            <View className="gap-2">
              {leaderboard.map((player) => (
                <View 
                  key={player.rank}
                  className="bg-background rounded-xl p-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ 
                        backgroundColor: player.rank === 1 ? '#FFD700' : 
                                       player.rank === 2 ? '#C0C0C0' : 
                                       player.rank === 3 ? '#CD7F32' : colors.surface 
                      }}
                    >
                      <Text className="font-bold">{player.rank}</Text>
                    </View>
                    <View>
                      <Text className="text-foreground font-semibold">{player.name}</Text>
                      <Text className="text-xs text-muted">{player.monster}</Text>
                    </View>
                  </View>
                  <Text className="text-success font-bold">{player.wins}W</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
