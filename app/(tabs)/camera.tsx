import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Camera/Food Scanner Screen
 * 
 * Features:
 * - Camera view for food scanning
 * - AI food recognition
 * - Nutrition display
 * - Food log history
 */
export default function CameraScreen() {
  const colors = useColors();
  const [isScanning, setIsScanning] = useState(false);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-6 gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Food Scanner</Text>
            <Text className="text-sm text-muted mt-1">Scan your meals to feed your monster</Text>
          </View>

          {/* Camera Placeholder */}
          <View 
            className="bg-surface rounded-3xl overflow-hidden items-center justify-center"
            style={{ 
              height: 400,
              borderWidth: 2,
              borderColor: colors.border,
              borderStyle: 'dashed'
            }}
          >
            <IconSymbol name="camera.fill" size={64} color={colors.muted} />
            <Text className="text-muted mt-4 text-center px-8">
              Camera integration coming soon{"\n"}
              Tap the button below to scan food
            </Text>
          </View>

          {/* Scan Button */}
          <TouchableOpacity 
            className="bg-primary rounded-2xl p-5 items-center"
            activeOpacity={0.7}
            onPress={() => setIsScanning(!isScanning)}
          >
            <View className="flex-row items-center gap-3">
              <IconSymbol name="camera.fill" size={24} color="#ffffff" />
              <Text className="text-white text-lg font-bold">
                {isScanning ? "Stop Scanning" : "Start Scanning"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Log Options */}
          <View className="bg-surface rounded-2xl p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-3">Quick Log</Text>
            <View className="flex-row flex-wrap gap-2">
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((meal) => (
                <TouchableOpacity
                  key={meal}
                  className="bg-background rounded-xl px-4 py-3"
                  activeOpacity={0.7}
                >
                  <Text className="text-foreground font-medium">{meal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Logs */}
          <View className="bg-surface rounded-2xl p-4 mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground mb-3">Recent Logs</Text>
            <View className="gap-3">
              <View className="bg-background rounded-xl p-3">
                <Text className="text-foreground font-semibold">Grilled Chicken Salad</Text>
                <Text className="text-xs text-muted mt-1">450 cal • 35g protein • 2 hours ago</Text>
              </View>
              <View className="bg-background rounded-xl p-3">
                <Text className="text-foreground font-semibold">Protein Shake</Text>
                <Text className="text-xs text-muted mt-1">200 cal • 25g protein • 5 hours ago</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
