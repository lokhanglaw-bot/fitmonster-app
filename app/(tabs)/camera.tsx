import { useState, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type FoodItem = {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type AnalysisResult = {
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  healthScore: number;
  summary: string;
};

type AnalysisState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; imageUrl: string; analysis: AnalysisResult }
  | { status: "error"; message: string };

export default function CameraScreen() {
  const colors = useColors();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const analyzeMutation = trpc.foodLogs.analyze.useMutation();
  const saveMutation = trpc.foodLogs.create.useMutation();

  const pickAndAnalyze = useCallback(
    async (source: "camera" | "gallery") => {
      try {
        let result: ImagePicker.ImagePickerResult;

        if (source === "camera") {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Required", "Camera permission is needed to take food photos.");
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
          });
        } else {
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
          });
        }

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setAnalysisState({ status: "analyzing" });
        setSaved(false);

        // Read image as base64
        let base64: string;
        if (Platform.OS === "web") {
          // On web, fetch the blob and convert to base64
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(",")[1] || "");
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // Send to server for AI analysis
        const response = await analyzeMutation.mutateAsync({
          imageBase64: base64,
          mimeType: asset.mimeType || "image/jpeg",
        });

        setAnalysisState({
          status: "done",
          imageUrl: response.imageUrl,
          analysis: response.analysis as AnalysisResult,
        });
      } catch (error: any) {
        console.error("Food analysis error:", error);
        setAnalysisState({
          status: "error",
          message: error.message || "Failed to analyze food. Please try again.",
        });
      }
    },
    [analyzeMutation]
  );

  const handleSaveLog = useCallback(async () => {
    if (analysisState.status !== "done") return;
    setIsSaving(true);
    try {
      const { analysis, imageUrl } = analysisState;
      const expEarned = Math.round(analysis.healthScore * 10 + analysis.totalProtein * 0.5);
      await saveMutation.mutateAsync({
        foodName: analysis.summary || analysis.foods.map((f) => f.name).join(", "),
        calories: analysis.totalCalories,
        protein: analysis.totalProtein,
        carbs: analysis.totalCarbs,
        fats: analysis.totalFat,
        imageUrl,
        mealType: analysis.mealType,
        expEarned,
      });
      setSaved(true);
      Alert.alert(
        "Food Logged!",
        `Your monster earned ${expEarned} EXP from this meal! 🎉`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      if (error.data?.code === "UNAUTHORIZED") {
        Alert.alert("Login Required", "Please log in to save food logs.");
      } else {
        Alert.alert("Error", "Failed to save food log. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [analysisState, saveMutation]);

  const handleReset = useCallback(() => {
    setSelectedImageUri(null);
    setAnalysisState({ status: "idle" });
    setSaved(false);
  }, []);

  const renderHealthBar = (score: number) => {
    const barColor =
      score >= 7 ? "#22C55E" : score >= 4 ? "#F59E0B" : "#EF4444";
    return (
      <View style={styles.healthBarContainer}>
        <View style={[styles.healthBarBg, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.healthBarFill,
              { width: `${score * 10}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={[styles.healthBarLabel, { color: barColor }]}>{score}/10</Text>
      </View>
    );
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <View style={[styles.foodItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.foodItemHeader}>
        <Text style={[styles.foodItemName, { color: colors.foreground }]}>{item.name}</Text>
        <Text style={[styles.foodItemPortion, { color: colors.muted }]}>{item.portion}</Text>
      </View>
      <View style={styles.foodItemNutrients}>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🔥</Text>
          <Text style={[styles.nutrientValue, { color: "#F59E0B" }]}>{item.calories}</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>cal</Text>
        </View>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🥩</Text>
          <Text style={[styles.nutrientValue, { color: "#EF4444" }]}>{item.protein}g</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>protein</Text>
        </View>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🍞</Text>
          <Text style={[styles.nutrientValue, { color: "#3B82F6" }]}>{item.carbs}g</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>carbs</Text>
        </View>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🧈</Text>
          <Text style={[styles.nutrientValue, { color: "#8B5CF6" }]}>{item.fat}g</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>fat</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Food Scanner</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            AI analyzes food nutrition to feed your monster
          </Text>
        </View>

        {/* Analyzing State */}
        {analysisState.status === "analyzing" && (
          <View style={[styles.analyzingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} contentFit="cover" />
            )}
            <View style={styles.analyzingContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.analyzingText, { color: colors.foreground }]}>
                Analyzing your meal...
              </Text>
              <Text style={[styles.analyzingSubtext, { color: colors.muted }]}>
                AI is identifying food items and calculating nutrition
              </Text>
            </View>
          </View>
        )}

        {/* Error State */}
        {analysisState.status === "error" && (
          <View style={[styles.errorCard, { backgroundColor: "#1a0a0a", borderColor: "#EF4444" }]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: "#EF4444" }]}>{analysisState.message}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: "#EF4444" }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results State */}
        {analysisState.status === "done" && (
          <View style={styles.resultsContainer}>
            {/* Food Image */}
            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.resultImage} contentFit="cover" />
            )}

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryText, { color: colors.foreground }]}>
                {analysisState.analysis.summary}
              </Text>
              <View style={styles.mealTypeBadge}>
                <Text style={styles.mealTypeText}>
                  {analysisState.analysis.mealType.charAt(0).toUpperCase() +
                    analysisState.analysis.mealType.slice(1)}
                </Text>
              </View>
            </View>

            {/* Total Nutrition Overview */}
            <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.totalTitle, { color: colors.foreground }]}>Total Nutrition</Text>
              <View style={styles.totalGrid}>
                <View style={[styles.totalItem, { backgroundColor: "#F59E0B20" }]}>
                  <Text style={styles.totalEmoji}>🔥</Text>
                  <Text style={[styles.totalValue, { color: "#F59E0B" }]}>
                    {analysisState.analysis.totalCalories}
                  </Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>Calories</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: "#EF444420" }]}>
                  <Text style={styles.totalEmoji}>🥩</Text>
                  <Text style={[styles.totalValue, { color: "#EF4444" }]}>
                    {analysisState.analysis.totalProtein}g
                  </Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>Protein</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: "#3B82F620" }]}>
                  <Text style={styles.totalEmoji}>🍞</Text>
                  <Text style={[styles.totalValue, { color: "#3B82F6" }]}>
                    {analysisState.analysis.totalCarbs}g
                  </Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>Carbs</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: "#8B5CF620" }]}>
                  <Text style={styles.totalEmoji}>🧈</Text>
                  <Text style={[styles.totalValue, { color: "#8B5CF6" }]}>
                    {analysisState.analysis.totalFat}g
                  </Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>Fat</Text>
                </View>
              </View>
            </View>

            {/* Health Score */}
            <View style={[styles.healthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.healthTitle, { color: colors.foreground }]}>Health Score</Text>
              {renderHealthBar(analysisState.analysis.healthScore)}
            </View>

            {/* Individual Food Items */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Food Items</Text>
            <FlatList
              data={analysisState.analysis.foods}
              renderItem={renderFoodItem}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              {!saved ? (
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: "#22C55E" }]}
                  onPress={handleSaveLog}
                  activeOpacity={0.8}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.saveBtnEmoji}>🍖</Text>
                      <Text style={styles.saveBtnText}>Feed Monster & Save Log</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.savedBadge, { backgroundColor: "#22C55E20", borderColor: "#22C55E" }]}>
                  <Text style={styles.savedText}>✅ Saved! Monster fed successfully</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.newScanBtn, { borderColor: colors.primary }]}
                onPress={handleReset}
                activeOpacity={0.8}
              >
                <IconSymbol name="camera.fill" size={20} color={colors.primary} />
                <Text style={[styles.newScanBtnText, { color: colors.primary }]}>Scan Another Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Idle State - Camera/Gallery Buttons */}
        {(analysisState.status === "idle") && (
          <>
            <View style={[styles.cameraArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
                <IconSymbol name="camera.fill" size={48} color={colors.muted} />
              </View>
              <Text style={[styles.cameraTitle, { color: colors.foreground }]}>
                Take or upload food photo
              </Text>
              <Text style={[styles.cameraSubtitle, { color: colors.muted }]}>
                AI will automatically analyze nutrition
              </Text>
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => pickAndAnalyze("camera")}
                activeOpacity={0.8}
              >
                <IconSymbol name="camera.fill" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>Open Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => pickAndAnalyze("gallery")}
                activeOpacity={0.8}
              >
                <IconSymbol name="plus" size={22} color={colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100, gap: 16 },
  header: { gap: 4 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14 },

  // Camera area
  cameraArea: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cameraTitle: { fontSize: 18, fontWeight: "700" },
  cameraSubtitle: { fontSize: 14, textAlign: "center" },

  // Buttons
  buttonsContainer: { gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "700" },

  // Analyzing state
  analyzingCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
  },
  analyzingContent: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  analyzingText: { fontSize: 18, fontWeight: "700" },
  analyzingSubtext: { fontSize: 14, textAlign: "center" },

  // Error state
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  errorIcon: { fontSize: 32 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: "#fff", fontWeight: "700" },

  // Results
  resultsContainer: { gap: 16 },
  resultImage: { width: "100%", height: 220, borderRadius: 20 },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryText: { fontSize: 14, flex: 1, lineHeight: 20 },
  mealTypeBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mealTypeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Total nutrition
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  totalTitle: { fontSize: 16, fontWeight: "700" },
  totalGrid: { flexDirection: "row", gap: 8 },
  totalItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  totalEmoji: { fontSize: 20 },
  totalValue: { fontSize: 18, fontWeight: "800" },
  totalLabel: { fontSize: 11 },

  // Health score
  healthCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  healthTitle: { fontSize: 16, fontWeight: "700" },
  healthBarContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  healthBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  healthBarFill: { height: "100%", borderRadius: 6 },
  healthBarLabel: { fontSize: 16, fontWeight: "800", width: 40 },

  // Food items
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  foodItemCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  foodItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  foodItemName: { fontSize: 15, fontWeight: "700", flex: 1 },
  foodItemPortion: { fontSize: 13 },
  foodItemNutrients: { flexDirection: "row", gap: 6 },
  nutrientPill: { flex: 1, alignItems: "center", gap: 2 },
  nutrientEmoji: { fontSize: 14 },
  nutrientValue: { fontSize: 13, fontWeight: "700" },
  nutrientLabel: { fontSize: 10 },

  // Result actions
  resultActions: { gap: 12, marginTop: 4 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveBtnEmoji: { fontSize: 20 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  savedBadge: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  savedText: { color: "#22C55E", fontSize: 16, fontWeight: "700" },
  newScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  newScanBtnText: { fontSize: 16, fontWeight: "700" },
});
