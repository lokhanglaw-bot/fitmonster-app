import { useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ImagePreviewModalProps = {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
};

export function ImagePreviewModal({ visible, imageUrl, onClose }: ImagePreviewModalProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <View style={styles.closeBtnBg}>
            <IconSymbol name="xmark" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            contentFit="contain"
            transition={200}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    right: 16,
    zIndex: 10,
  },
  closeBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH - 16,
    height: SCREEN_HEIGHT * 0.7,
  },
});
