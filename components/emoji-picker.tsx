import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ScrollView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

// Emoji categories with commonly used emojis
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭",
      "🤫", "🤔", "😐", "😑", "😶", "😏", "😒", "🙄",
      "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷",
      "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵",
      "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕",
      "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦",
      "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖",
      "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡",
      "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡",
      "👹", "👺", "👻", "👽", "👾", "🤖",
    ],
  },
  {
    name: "Gestures",
    icon: "👋",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏",
      "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
      "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛",
      "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪",
      "🦾", "🦵", "🦿", "🦶", "👂", "🦻", "👃", "🧠",
      "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄",
    ],
  },
  {
    name: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "♥️", "💋", "💌", "💐", "🌹",
      "🌷", "🌺", "🌸", "🌼", "🌻", "🏵️", "💮", "🎀",
    ],
  },
  {
    name: "Fitness",
    icon: "💪",
    emojis: [
      "💪", "🏋️", "🏃", "🚴", "🧘", "🤸", "⛹️", "🏊",
      "🥊", "🥋", "🏆", "🥇", "🥈", "🥉", "🎯", "⚡",
      "🔥", "💥", "✨", "🌟", "⭐", "🎉", "🎊", "🎈",
      "🍎", "🥗", "🥦", "🥕", "🍌", "🥑", "🍗", "🥩",
      "🥚", "🥛", "💧", "🧃", "🍵", "☕", "⏱️", "📊",
      "📈", "🎵", "🎶", "😤", "🦁", "🐉", "🦖", "🐲",
    ],
  },
  {
    name: "Objects",
    icon: "🎮",
    emojis: [
      "🎮", "🕹️", "🎲", "🎯", "🎳", "🎪", "🎭", "🎨",
      "📱", "💻", "⌨️", "🖥️", "📷", "📸", "📹", "🎥",
      "📺", "📻", "🎙️", "🎧", "🎤", "🎬", "🎵", "🎶",
      "🎸", "🎹", "🥁", "🎺", "🎻", "🪗", "🎼", "🎞️",
      "📚", "📖", "📝", "✏️", "🖊️", "📌", "📎", "🔗",
      "💡", "🔦", "🕯️", "🔑", "🗝️", "🔒", "🔓", "🛡️",
    ],
  },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const EMOJI_SIZE = 36;
const EMOJI_COLS = Math.floor((SCREEN_WIDTH - 32) / EMOJI_SIZE);

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState(0);

  const currentEmojis = useMemo(
    () => EMOJI_CATEGORIES[selectedCategory].emojis,
    [selectedCategory]
  );

  const handleEmojiPress = useCallback(
    (emoji: string) => {
      onSelect(emoji);
    },
    [onSelect]
  );

  const renderEmoji = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        onPress={() => handleEmojiPress(item)}
        style={styles.emojiBtn}
        activeOpacity={0.6}
      >
        <Text style={styles.emojiText}>{item}</Text>
      </TouchableOpacity>
    ),
    [handleEmojiPress]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryBarContent}
      >
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <TouchableOpacity
            key={cat.name}
            onPress={() => setSelectedCategory(idx)}
            style={[
              styles.categoryTab,
              selectedCategory === idx && { backgroundColor: colors.primary + "20", borderRadius: 8 },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Emoji grid */}
      <FlatList
        data={currentEmojis}
        renderItem={renderEmoji}
        keyExtractor={(item, index) => `${item}-${index}`}
        numColumns={EMOJI_COLS}
        style={styles.emojiGrid}
        contentContainerStyle={styles.emojiGridContent}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: EMOJI_SIZE,
          offset: EMOJI_SIZE * Math.floor(index / EMOJI_COLS),
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderTopWidth: 1,
  },
  categoryBar: {
    maxHeight: 44,
  },
  categoryBarContent: {
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  categoryTab: {
    width: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIcon: {
    fontSize: 22,
  },
  emojiGrid: {
    flex: 1,
  },
  emojiGridContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  emojiBtn: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 26,
  },
});
