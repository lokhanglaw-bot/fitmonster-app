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
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useActivity } from "@/lib/activity-context";
import { useI18n } from "@/lib/i18n-context";
import { useCaring } from "@/lib/caring-context";

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
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
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

  const { logFood } = useActivity();
  const { feedMonster: caringFeedMonster } = useCaring();

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
      expEarned,
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
              <View style={styles.mealTypeBadge}>
                <Text style={styles.mealTypeText}>
                  {analysisState.analysis.mealType === "breakfast" ? t.mealBreakfast : analysisState.analysis.mealType === "lunch" ? t.mealLunch : analysisState.analysis.mealType === "dinner" ? t.mealDinner : t.mealSnack}
                </Text>
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
              <Image source={require("@/assets/monsters/bodybuilder-stage1.png")} style={styles.feedMonsterImg} contentFit="contain" />
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
});
