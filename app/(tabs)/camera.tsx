import { useState, useCallback, useEffect, useRef } from "react";
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
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Share,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useActivity } from "@/lib/activity-context";
import { useI18n } from "@/lib/i18n-context";
import { useCaring } from "@/lib/caring-context";
import { getMonsterImageForCaringState } from "@/lib/monster-expressions";
import * as Linking from "expo-linking";

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
  const { t, language } = useI18n();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Meal type selection (user chooses which meal to assign)
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner">("breakfast");
  const [showShareCard, setShowShareCard] = useState(false);

  // Edit food item state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FoodItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Feed monster animation state
  const [showFeedAnimation, setShowFeedAnimation] = useState(false);
  const [feedExp, setFeedExp] = useState(0);
  const feedScale = useRef(new Animated.Value(0)).current;
  const feedOpacity = useRef(new Animated.Value(0)).current;
  const sparkleRotate = useRef(new Animated.Value(0)).current;
  const expFloat = useRef(new Animated.Value(0)).current;

  const analyzeMutation = trpc.foodLogs.analyze.useMutation();
  const saveMutation = trpc.foodLogs.create.useMutation();

  const playFeedAnimation = useCallback((exp: number) => {
    setFeedExp(exp);
    setShowFeedAnimation(true);
    feedScale.setValue(0);
    feedOpacity.setValue(0);
    sparkleRotate.setValue(0);
    expFloat.setValue(0);

    Animated.sequence([
      // Monster appears with bounce
      Animated.parallel([
        Animated.spring(feedScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(feedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // Sparkle rotation + EXP float up
      Animated.parallel([
        Animated.timing(sparkleRotate, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(expFloat, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      // Hold for a moment
      Animated.delay(600),
      // Fade out
      Animated.timing(feedOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setShowFeedAnimation(false);
    });
  }, [feedScale, feedOpacity, sparkleRotate, expFloat]);

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

        let base64: string;
        if (Platform.OS === "web") {
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
          base64 = await new File(asset.uri).base64();
        }

        const response = await analyzeMutation.mutateAsync({
          imageBase64: base64,
          mimeType: asset.mimeType || "image/jpeg",
          language: language as "en" | "zh",
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

  const { logFood, state: activityState } = useActivity();
  const { state: caringState, feedMonster: caringFeedMonster } = useCaring();
  const cameraMonster = activityState.monsters?.find((m: any) => m.isActive) || activityState.monsters?.[0];

  const handleSaveLog = useCallback(async () => {
    if (analysisState.status !== "done") return;
    setIsSaving(true);
    const { analysis, imageUrl } = analysisState;
    const expEarned = Math.round(analysis.healthScore * 10 + analysis.totalProtein * 0.5);

    // Update shared activity state so quests update in real time
    logFood({
      name: analysis.summary || analysis.foods.map((f) => f.name).join(", "),
      calories: analysis.totalCalories,
      protein: analysis.totalProtein,
      carbs: analysis.totalCarbs,
      fat: analysis.totalFat,
      sugar: (analysis as any).totalSugar || 0,
      expEarned,
      mealType: selectedMealType,
      imageUri: imageUrl || selectedImageUri || undefined,
    });

    // Play the feed monster animation immediately for visual feedback
    setSaved(true);
    setIsSaving(false);
    playFeedAnimation(expEarned);

    // Auto-feed monster via caring system
    caringFeedMonster(
      analysis.totalCalories,
      analysis.totalProtein,
      analysis.totalCarbs,
      analysis.totalFat,
      analysis.mealType || "meal"
    ).catch(() => {});

    // Try to save to database in background (non-blocking)
    try {
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
    } catch (error: any) {
      // Save failed silently - animation already played for good UX
      console.log("Save food log failed (user may not be logged in):", error.message);
    }
  }, [analysisState, saveMutation, playFeedAnimation]);

  const handleReset = useCallback(() => {
    setSelectedImageUri(null);
    setAnalysisState({ status: "idle" });
    setSaved(false);
  }, []);

  // ─── Edit food item handlers ───
  const handleEditFoodItem = useCallback((index: number) => {
    if (analysisState.status !== "done") return;
    const item = analysisState.analysis.foods[index];
    setEditingIndex(index);
    setEditForm({ ...item });
    setShowEditModal(true);
  }, [analysisState]);

  const handleSaveEdit = useCallback(() => {
    if (analysisState.status !== "done" || editingIndex === null || !editForm) return;
    const updatedFoods = [...analysisState.analysis.foods];
    updatedFoods[editingIndex] = { ...editForm };
    // Recalculate totals from all food items
    const totalCalories = updatedFoods.reduce((sum, f) => sum + f.calories, 0);
    const totalProtein = updatedFoods.reduce((sum, f) => sum + f.protein, 0);
    const totalCarbs = updatedFoods.reduce((sum, f) => sum + f.carbs, 0);
    const totalFat = updatedFoods.reduce((sum, f) => sum + f.fat, 0);
    setAnalysisState({
      ...analysisState,
      analysis: {
        ...analysisState.analysis,
        foods: updatedFoods,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      },
    });
    setShowEditModal(false);
    setEditingIndex(null);
    setEditForm(null);
    setSaved(false); // Allow re-saving with corrected data
  }, [analysisState, editingIndex, editForm]);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingIndex(null);
    setEditForm(null);
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

  const renderFoodItem = ({ item, index }: { item: FoodItem; index: number }) => (
    <View style={[styles.foodItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.foodItemHeader}>
        <Text style={[styles.foodItemName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => handleEditFoodItem(index)}
          activeOpacity={0.7}
          style={[styles.editItemBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
        >
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>✏️ {t.editFood}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.foodItemPortion, { color: colors.muted }]}>{item.portion}</Text>
      <View style={styles.foodItemNutrients}>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🔥</Text>
          <Text style={[styles.nutrientValue, { color: "#F59E0B" }]}>{item.calories}</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>{t.calLabel}</Text>
        </View>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🥩</Text>
          <Text style={[styles.nutrientValue, { color: "#EF4444" }]}>{item.protein}g</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>{t.proteinLabel}</Text>
        </View>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🍞</Text>
          <Text style={[styles.nutrientValue, { color: "#3B82F6" }]}>{item.carbs}g</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>{t.carbsLabel}</Text>
        </View>
        <View style={styles.nutrientPill}>
          <Text style={styles.nutrientEmoji}>🧈</Text>
          <Text style={[styles.nutrientValue, { color: "#8B5CF6" }]}>{item.fat}g</Text>
          <Text style={[styles.nutrientLabel, { color: colors.muted }]}>{t.fatLabel}</Text>
        </View>
      </View>
    </View>
  );

  const spinInterpolate = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const expTranslateY = expFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });

  const expOpacity = expFloat.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.foodScanner}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {t.aiAnalyzesFood}
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
                {t.analyzingMeal}
              </Text>
              <Text style={[styles.analyzingSubtext, { color: colors.muted }]}>
                {t.aiIdentifying}
              </Text>
            </View>
          </View>
        )}

        {/* Error State */}
        {analysisState.status === "error" && (
          <View style={[styles.errorCard, { backgroundColor: "#FEF2F2", borderColor: "#EF4444" }]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: "#EF4444" }]}>{analysisState.message}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: "#EF4444" }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>{t.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results State */}
        {analysisState.status === "done" && (
          <View style={styles.resultsContainer}>
            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.resultImage} contentFit="cover" />
            )}

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryText, { color: colors.foreground }]}>
                {analysisState.analysis.summary}
              </Text>
            </View>

            {/* Meal Type Selector */}
            <View style={[styles.mealSelectorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[{ fontSize: 14, fontWeight: "700", marginBottom: 8 }, { color: colors.foreground }]}>選擇餐別</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["breakfast", "lunch", "dinner"] as const).map((mt) => {
                  const labels = { breakfast: "🌅 早餐", lunch: "☀️ 午餐", dinner: "🌙 晚餐" };
                  const isSelected = selectedMealType === mt;
                  return (
                    <TouchableOpacity
                      key={mt}
                      onPress={() => setSelectedMealType(mt)}
                      activeOpacity={0.7}
                      style={[{
                        flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2, alignItems: "center" as const,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? `${colors.primary}15` : colors.background,
                      }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: isSelected ? "700" : "500", color: isSelected ? colors.primary : colors.foreground }}>{labels[mt]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.totalTitle, { color: colors.foreground }]}>{t.totalNutrition}</Text>
              <View style={styles.totalGrid}>
                <View style={[styles.totalItem, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={styles.totalEmoji}>🔥</Text>
                  <Text style={[styles.totalValue, { color: "#F59E0B" }]}>{analysisState.analysis.totalCalories}</Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>{t.calories}</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: "#FEE2E2" }]}>
                  <Text style={styles.totalEmoji}>🥩</Text>
                  <Text style={[styles.totalValue, { color: "#EF4444" }]}>{analysisState.analysis.totalProtein}g</Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>{t.proteinShort}</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: "#DBEAFE" }]}>
                  <Text style={styles.totalEmoji}>🍞</Text>
                  <Text style={[styles.totalValue, { color: "#3B82F6" }]}>{analysisState.analysis.totalCarbs}g</Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>{t.carbsShort}</Text>
                </View>
                <View style={[styles.totalItem, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={styles.totalEmoji}>🧈</Text>
                  <Text style={[styles.totalValue, { color: "#8B5CF6" }]}>{analysisState.analysis.totalFat}g</Text>
                  <Text style={[styles.totalLabel, { color: colors.muted }]}>{t.fatShort}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.healthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.healthTitle, { color: colors.foreground }]}>{t.healthScore}</Text>
              {renderHealthBar(analysisState.analysis.healthScore)}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.foodItems}</Text>
            <Text style={[styles.editHint, { color: colors.muted }]}>{t.aiMayBeWrong}</Text>
            <FlatList
              data={analysisState.analysis.foods}
              renderItem={renderFoodItem}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />

            {/* Nutrition Data Citation - Required by Apple Guideline 1.4.1 */}
            <View style={[styles.citationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.citationTitle, { color: colors.muted }]}>{t.nutritionDataSource}</Text>
              <Text style={[styles.citationText, { color: colors.muted }]}>
                {t.nutritionCitationText}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://fdc.nal.usda.gov/")}
                activeOpacity={0.7}
              >
                <Text style={[styles.citationLink, { color: colors.primary }]}>
                  USDA FoodData Central (fdc.nal.usda.gov)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://www.who.int/news-room/fact-sheets/detail/healthy-diet")}
                activeOpacity={0.7}
              >
                <Text style={[styles.citationLink, { color: colors.primary }]}>
                  WHO Healthy Diet Guidelines
                </Text>
              </TouchableOpacity>
            </View>

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
                      <Text style={styles.saveBtnText}>{t.feedMonsterSave}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.savedBadge, { backgroundColor: "#DCFCE7", borderColor: "#22C55E" }]}>
                  <Text style={styles.savedText}>✅ {t.monsterFed}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.newScanBtn, { borderColor: colors.primary }]}
                onPress={handleReset}
                activeOpacity={0.8}
              >
                <IconSymbol name="camera.fill" size={20} color={colors.primary} />
                <Text style={[styles.newScanBtnText, { color: colors.primary }]}>{t.scanAnotherMeal}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's 3 Meals + Share */}
        {analysisState.status === "idle" && (() => {
          const logs = activityState.todayFoodLogs || [];
          const breakfastLog = logs.find((l: any) => l.mealType === "breakfast");
          const lunchLog = logs.find((l: any) => l.mealType === "lunch");
          const dinnerLog = logs.find((l: any) => l.mealType === "dinner");
          const allMealsRecorded = !!(breakfastLog && lunchLog && dinnerLog);
          const meals = [
            { key: "breakfast", emoji: "🌅", label: "早餐", log: breakfastLog },
            { key: "lunch", emoji: "☀️", label: "午餐", log: lunchLog },
            { key: "dinner", emoji: "🌙", label: "晚餐", log: dinnerLog },
          ];
          return (
            <View style={[styles.mealBoxesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.mealBoxesTitle, { color: colors.foreground }]}>今日三餐</Text>
              <Text style={[styles.mealBoxesSubtitle, { color: colors.muted }]}>
                拍完早午晚三餐即可解鎖分享功能
              </Text>
              <View style={styles.mealBoxesRow}>
                {meals.map((m) => (
                  <View key={m.key} style={[styles.mealBox, { borderColor: m.log ? colors.primary : colors.border, backgroundColor: m.log ? `${colors.primary}10` : colors.background }]}>
                    {m.log?.imageUri ? (
                      <Image source={{ uri: m.log.imageUri }} style={styles.mealBoxImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.mealBoxPlaceholder, { backgroundColor: colors.background }]}>
                        <Text style={styles.mealBoxPlaceholderEmoji}>{m.emoji}</Text>
                      </View>
                    )}
                    <Text style={[styles.mealBoxLabel, { color: m.log ? colors.primary : colors.foreground }]}>{m.label}</Text>
                    {m.log ? (
                      <Text style={[styles.mealBoxKcal, { color: colors.primary }]}>{m.log.calories} kcal</Text>
                    ) : (
                      <Text style={[styles.mealBoxEmpty, { color: colors.muted }]}>未記錄</Text>
                    )}
                  </View>
                ))}
              </View>
              {allMealsRecorded ? (
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: "#22C55E" }]}
                  onPress={() => setShowShareCard(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareBtnText}>📸 分享今日操野成果</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.shareBtnLocked, { borderColor: colors.border }]}>
                  <Text style={[styles.shareBtnLockedText, { color: colors.muted }]}>🔒 完成三餐記錄後解鎖分享</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Idle State */}
        {analysisState.status === "idle" && (
          <>
            <View style={[styles.cameraArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
                <IconSymbol name="camera.fill" size={48} color={colors.muted} />
              </View>
              <Text style={[styles.cameraTitle, { color: colors.foreground }]}>
                {t.takeOrUploadPhoto}
              </Text>
              <Text style={[styles.cameraSubtitle, { color: colors.muted }]}>
                {t.aiAutoAnalyze}
              </Text>
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => pickAndAnalyze("camera")}
                activeOpacity={0.8}
              >
                <IconSymbol name="camera.fill" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>{t.openCamera}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => pickAndAnalyze("gallery")}
                activeOpacity={0.8}
              >
                <IconSymbol name="plus" size={22} color={colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  {t.chooseFromGallery}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Food Item Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={handleCancelEdit}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.editModalOverlay}>
          <View style={[styles.editModalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.editModalTitle, { color: colors.foreground }]}>{t.editFoodTitle}</Text>

            <ScrollView style={styles.editFormScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.editFormGroup}>
                <Text style={[styles.editLabel, { color: colors.muted }]}>{t.foodNameLabel}</Text>
                <TextInput
                  style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={editForm?.name || ""}
                  onChangeText={(v) => setEditForm(prev => prev ? { ...prev, name: v } : prev)}
                  placeholder={t.foodNameLabel}
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={[styles.editLabel, { color: colors.muted }]}>{t.portionLabel}</Text>
                <TextInput
                  style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={editForm?.portion || ""}
                  onChangeText={(v) => setEditForm(prev => prev ? { ...prev, portion: v } : prev)}
                  placeholder={t.portionLabel}
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View style={styles.editFormRow}>
                <View style={[styles.editFormGroup, { flex: 1 }]}>
                  <Text style={[styles.editLabel, { color: colors.muted }]}>{t.caloriesLabel}</Text>
                  <TextInput
                    style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                    value={String(editForm?.calories ?? "")}
                    onChangeText={(v) => setEditForm(prev => prev ? { ...prev, calories: parseInt(v) || 0 } : prev)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={[styles.editFormGroup, { flex: 1 }]}>
                  <Text style={[styles.editLabel, { color: colors.muted }]}>{t.proteinGrams}</Text>
                  <TextInput
                    style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                    value={String(editForm?.protein ?? "")}
                    onChangeText={(v) => setEditForm(prev => prev ? { ...prev, protein: parseFloat(v) || 0 } : prev)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>

              <View style={styles.editFormRow}>
                <View style={[styles.editFormGroup, { flex: 1 }]}>
                  <Text style={[styles.editLabel, { color: colors.muted }]}>{t.carbsGrams}</Text>
                  <TextInput
                    style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                    value={String(editForm?.carbs ?? "")}
                    onChangeText={(v) => setEditForm(prev => prev ? { ...prev, carbs: parseFloat(v) || 0 } : prev)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={[styles.editFormGroup, { flex: 1 }]}>
                  <Text style={[styles.editLabel, { color: colors.muted }]}>{t.fatGrams}</Text>
                  <TextInput
                    style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                    value={String(editForm?.fat ?? "")}
                    onChangeText={(v) => setEditForm(prev => prev ? { ...prev, fat: parseFloat(v) || 0 } : prev)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>

              <View style={styles.editFormGroup}>
                <Text style={[styles.editLabel, { color: colors.muted }]}>{t.fiberGrams}</Text>
                <TextInput
                  style={[styles.editInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={String(editForm?.fiber ?? "")}
                  onChangeText={(v) => setEditForm(prev => prev ? { ...prev, fiber: parseFloat(v) || 0 } : prev)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </ScrollView>

            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={[styles.editCancelBtn, { borderColor: colors.border }]}
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <Text style={[styles.editCancelText, { color: colors.muted }]}>{t.cancelEdit}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.editSaveText}>{t.saveChanges}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Feed Monster Animation Overlay */}
      {showFeedAnimation && (
        <View style={styles.feedOverlay}>
          <Animated.View style={[styles.feedContainer, { opacity: feedOpacity, transform: [{ scale: feedScale }] }]}>
            {/* Sparkle ring */}
            <Animated.View style={[styles.sparkleRing, { transform: [{ rotate: spinInterpolate }] }]}>
              <Text style={styles.sparkle}>✨</Text>
              <Text style={[styles.sparkle, styles.sparkle2]}>⭐</Text>
              <Text style={[styles.sparkle, styles.sparkle3]}>✨</Text>
              <Text style={[styles.sparkle, styles.sparkle4]}>💫</Text>
            </Animated.View>

            {/* Monster */}
            <LinearGradient colors={["#DCFCE7", "#BBF7D0"]} style={styles.feedMonsterBg}>
              <Image source={getMonsterImageForCaringState(cameraMonster?.type || 'bodybuilder', cameraMonster?.stage || 1, caringState.fullness, caringState.energy, caringState.mood, caringState.peakStateBuff)} style={styles.feedMonsterImg} contentFit="contain" />
            </LinearGradient>

            {/* Floating EXP text */}
            <Animated.View style={[styles.expFloater, { transform: [{ translateY: expTranslateY }], opacity: expOpacity }]}>
              <Text style={styles.expFloatText}>+{feedExp} EXP 🎉</Text>
            </Animated.View>

            <Text style={styles.feedTitle}>{t.monsterFed}</Text>
            <Text style={styles.feedSubtitle}>{t.monsterGettingStronger}</Text>
          </Animated.View>
        </View>
      )}

      {/* Share Card Modal */}
      <Modal visible={showShareCard} transparent animationType="fade" onRequestClose={() => setShowShareCard(false)}>
        {(() => {
          const logs = activityState.todayFoodLogs || [];
          const bLog = logs.find((l: any) => l.mealType === "breakfast");
          const lLog = logs.find((l: any) => l.mealType === "lunch");
          const dLog = logs.find((l: any) => l.mealType === "dinner");
          const tCal = logs.reduce((s: number, l: any) => s + (l.calories || 0), 0);
          const tProtein = logs.reduce((s: number, l: any) => s + (l.protein || 0), 0);
          const tCarbs = logs.reduce((s: number, l: any) => s + (l.carbs || 0), 0);
          const tFat = logs.reduce((s: number, l: any) => s + (l.fat || 0), 0);
          const tSugar = logs.reduce((s: number, l: any) => s + (l.sugar || 0), 0);
          const maxMacro = Math.max(tProtein, tCarbs, tFat, 1);
          const monsterName = cameraMonster?.name || cameraMonster?.type || "我的怪獸";
          const mealItems = [
            { emoji: "🌅", label: "早餐", log: bLog },
            { emoji: "☀️", label: "午餐", log: lLog },
            { emoji: "🌙", label: "晚餐", log: dLog },
          ];
          const handleShare = async () => {
            try {
              await Share.share({
                message: `🍕 ${monsterName} 的今日飲食\n━━━━━━━━━━\n🌅 早餐: ${bLog ? `${bLog.calories} kcal` : "未記錄"}\n☀️ 午餐: ${lLog ? `${lLog.calories} kcal` : "未記錄"}\n🌙 晚餐: ${dLog ? `${dLog.calories} kcal` : "未記錄"}\n━━━━━━━━━━\n🔥 總熱量: ${tCal} kcal\n🧑‍🍳 蛋白質: ${tProtein}g | 碳水: ${tCarbs}g | 脂肪: ${tFat}g${tSugar > 25 ? `\n⚠️ 糖分: ${tSugar}g (超標!)` : `\n🍬 糖分: ${tSugar}g`}\n\n— My Fit Monster 👾`,
              });
            } catch (_e) { /* user cancelled */ }
          };
          return (
            <View style={styles.shareOverlay}>
              <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.shareCardContainer}>
                <View style={styles.shareCardHeader}>
                  <Image
                    source={getMonsterImageForCaringState(cameraMonster?.type || "bodybuilder", cameraMonster?.stage || 1, caringState.fullness, caringState.energy, caringState.mood, caringState.peakStateBuff)}
                    style={styles.shareCardMonsterImg}
                    contentFit="contain"
                  />
                  <Text style={styles.shareCardTitle}>{monsterName}</Text>
                </View>
                <View style={styles.shareCardMeals}>
                  {mealItems.map((m, i) => (
                    <View key={i} style={styles.shareCardMealBox}>
                      {m.log?.imageUri ? (
                        <Image source={{ uri: m.log.imageUri }} style={styles.shareCardMealImg} contentFit="cover" />
                      ) : (
                        <View style={[styles.shareCardMealImg, { backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center" as const, justifyContent: "center" as const }]}>
                          <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                        </View>
                      )}
                      <Text style={styles.shareCardMealLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.shareCardMacros}>
                  {[
                    { label: "蛋白質", value: tProtein, color: "#4ADE80" },
                    { label: "碳水", value: tCarbs, color: "#60A5FA" },
                    { label: "脂肪", value: tFat, color: "#FBBF24" },
                  ].map((macro, i) => (
                    <View key={i} style={styles.shareCardMacroItem}>
                      <Text style={styles.shareCardMacroLabel}>{macro.label}</Text>
                      <View style={styles.shareCardMacroBar}>
                        <View style={[styles.shareCardMacroFill, { width: `${Math.min((macro.value / maxMacro) * 100, 100)}%`, backgroundColor: macro.color }]} />
                      </View>
                      <Text style={styles.shareCardMacroValue}>{macro.value}g</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.shareCardKcal}>
                  <Text style={styles.shareCardKcalText}>{tCal}</Text>
                  <Text style={styles.shareCardKcalUnit}>kcal 總熱量</Text>
                </View>
                {tSugar > 25 && (
                  <View style={styles.shareCardSugar}>
                    <Text style={styles.shareCardSugarText}>⚠️ 糖分 {tSugar}g 超過建議量!</Text>
                  </View>
                )}
                <View style={styles.shareCardBrand}>
                  <Text style={styles.shareCardBrandText}>👾 My Fit Monster</Text>
                  <TouchableOpacity onPress={handleShare} activeOpacity={0.8}>
                    <Text style={{ color: "#4ADE80", fontSize: 14, fontWeight: "700" }}>分享 →</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              <TouchableOpacity style={styles.shareCardCloseBtn} onPress={() => setShowShareCard(false)} activeOpacity={0.8}>
                <Text style={styles.shareCardCloseText}>關閉</Text>
              </TouchableOpacity>
            </View>
          );
        })()}
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100, gap: 16 },
  header: { gap: 4 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14 },

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

  analyzingCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  previewImage: { width: "100%", height: 200 },
  analyzingContent: { padding: 24, alignItems: "center", gap: 12 },
  analyzingText: { fontSize: 18, fontWeight: "700" },
  analyzingSubtext: { fontSize: 14, textAlign: "center" },

  errorCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  errorIcon: { fontSize: 32 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: "#fff", fontWeight: "700" },

  resultsContainer: { gap: 16 },
  resultImage: { width: "100%", height: 220, borderRadius: 20 },

  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  summaryText: { fontSize: 14, flex: 1, lineHeight: 20 },
  mealTypeBadge: { backgroundColor: "#8B5CF6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  mealTypeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  totalTitle: { fontSize: 16, fontWeight: "700" },
  totalGrid: { flexDirection: "row", gap: 8 },
  totalItem: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  totalEmoji: { fontSize: 20 },
  totalValue: { fontSize: 18, fontWeight: "800" },
  totalLabel: { fontSize: 11 },

  healthCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  healthTitle: { fontSize: 16, fontWeight: "700" },
  healthBarContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  healthBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  healthBarFill: { height: "100%", borderRadius: 6 },
  healthBarLabel: { fontSize: 16, fontWeight: "800", width: 40 },

  sectionTitle: { fontSize: 16, fontWeight: "700" },
  foodItemCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  foodItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  foodItemName: { fontSize: 15, fontWeight: "700", flex: 1, lineHeight: 22 },
  foodItemPortion: { fontSize: 13, marginTop: -4 },
  foodItemNutrients: { flexDirection: "row", gap: 6 },
  nutrientPill: { flex: 1, alignItems: "center", gap: 2 },
  nutrientEmoji: { fontSize: 14 },
  nutrientValue: { fontSize: 13, fontWeight: "700" },
  nutrientLabel: { fontSize: 10 },

  resultActions: { gap: 12, marginTop: 4 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, gap: 8 },
  saveBtnEmoji: { fontSize: 20 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  savedBadge: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  savedText: { color: "#22C55E", fontSize: 16, fontWeight: "700" },
  newScanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, borderWidth: 2, gap: 8 },
  newScanBtnText: { fontSize: 16, fontWeight: "700" },

  // Feed Monster Animation
  feedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  feedContainer: {
    alignItems: "center",
    gap: 16,
  },
  sparkleRing: {
    position: "absolute",
    width: 220,
    height: 220,
    top: -30,
  },
  sparkle: { position: "absolute", fontSize: 28, top: 0, left: "50%" },
  sparkle2: { top: "50%", left: 0, fontSize: 24 },
  sparkle3: { top: "100%", left: "50%", fontSize: 28 },
  sparkle4: { top: "50%", left: "100%", fontSize: 24 },
  feedMonsterBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  feedMonsterImg: { width: 120, height: 120 },
  expFloater: {
    position: "absolute",
    top: -20,
  },
  expFloatText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFD700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  feedTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
  },
  feedSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
  },

  // Edit food styles
  editHint: { fontSize: 13, marginTop: -8, marginBottom: 4, fontStyle: "italic" },
  editItemBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  editModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  editFormScroll: {
    maxHeight: 400,
  },
  editFormGroup: {
    marginBottom: 14,
  },
  editFormRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  editModalActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 16,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center" as const,
  },
  editCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
  },
  editSaveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  citationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  citationTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  citationText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  citationLink: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline" as const,
    marginBottom: 4,
  },

  // Meal Selector
  mealSelectorCard: { borderRadius: 16, borderWidth: 1, padding: 16 },

  // Meal Boxes (Today's 3 Meals)
  mealBoxesCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  mealBoxesTitle: { fontSize: 18, fontWeight: "800" },
  mealBoxesSubtitle: { fontSize: 13 },
  mealBoxesRow: { flexDirection: "row" as const, gap: 10 },
  mealBox: { flex: 1, borderRadius: 14, borderWidth: 2, padding: 8, alignItems: "center" as const, gap: 4 },
  mealBoxImage: { width: 60, height: 60, borderRadius: 10 },
  mealBoxPlaceholder: { width: 60, height: 60, borderRadius: 10, alignItems: "center" as const, justifyContent: "center" as const },
  mealBoxPlaceholderEmoji: { fontSize: 28 },
  mealBoxLabel: { fontSize: 13, fontWeight: "700" },
  mealBoxKcal: { fontSize: 11, fontWeight: "600" },
  mealBoxEmpty: { fontSize: 11 },

  // Share Button
  shareBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, padding: 16, borderRadius: 16, gap: 8 },
  shareBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  shareBtnLocked: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  shareBtnLockedText: { fontSize: 14, fontWeight: "600" },

  // Share Card Modal
  shareOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center" as const, alignItems: "center" as const, padding: 20 },
  shareCardContainer: { width: "100%" as const, maxWidth: 380, borderRadius: 24, overflow: "hidden" as const },
  shareCardHeader: { padding: 20, alignItems: "center" as const, gap: 8 },
  shareCardTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  shareCardMeals: { flexDirection: "row" as const, paddingHorizontal: 16, gap: 8 },
  shareCardMealBox: { flex: 1, alignItems: "center" as const, gap: 4 },
  shareCardMealImg: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  shareCardMealLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  shareCardMacros: { flexDirection: "row" as const, paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  shareCardMacroItem: { flex: 1, alignItems: "center" as const, gap: 4 },
  shareCardMacroLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  shareCardMacroBar: { width: "100%" as const, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  shareCardMacroFill: { height: "100%" as const, borderRadius: 3 },
  shareCardMacroValue: { fontSize: 12, color: "#fff", fontWeight: "700" },
  shareCardMonsterImg: { width: 100, height: 100 },
  shareCardKcal: { alignItems: "center" as const, paddingVertical: 8 },
  shareCardKcalText: { fontSize: 36, fontWeight: "900", color: "#fff" },
  shareCardKcalUnit: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  shareCardSugar: { alignItems: "center" as const, paddingBottom: 12 },
  shareCardSugarText: { fontSize: 16, fontWeight: "700", color: "#FBBF24" },
  shareCardBrand: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  shareCardBrandText: { fontSize: 18, fontWeight: "900", color: "#4ADE80" },
  shareCardCloseBtn: { marginTop: 20, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  shareCardCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
