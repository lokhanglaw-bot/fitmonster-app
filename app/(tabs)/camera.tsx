import { Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function CameraScreen() {
  const colors = useColors();

  const handleOpenCamera = () => {
    Alert.alert("Camera", "Camera functionality will use the device camera to capture food photos for AI analysis.");
  };

  const handleChooseGallery = () => {
    Alert.alert("Gallery", "Gallery picker will allow selecting existing food photos for AI analysis.");
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Photo Feed</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            AI analyzes food nutrition to feed your monster
          </Text>
        </View>

        {/* Camera Placeholder */}
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

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenCamera}
            activeOpacity={0.8}
          >
            <IconSymbol name="camera.fill" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.primary }]}
            onPress={handleChooseGallery}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={22} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Food Logs */}
        <View style={styles.recentSection}>
          <Text style={[styles.recentTitle, { color: colors.foreground }]}>Recent Food Logs</Text>
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No food logged yet. Take a photo to get started!
            </Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
  },
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
  cameraTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cameraSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  buttonsContainer: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  recentSection: {
    gap: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});
