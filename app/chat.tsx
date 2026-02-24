import { useState, useCallback, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
  ActionSheetIOS,
  Animated as RNAnimated,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthContext } from "@/lib/auth-context";
import { useWebSocket } from "@/hooks/use-websocket";
import { EmojiPicker } from "@/components/emoji-picker";
import { ImagePreviewModal } from "@/components/image-preview-modal";
import { trpc } from "@/lib/trpc";

type ChatMessage = {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
};

export default function ChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();
  const friendIdNum = Number(friendId);
  const myId = user?.id || 0;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [restMode, setRestMode] = useState(false); // true = WS failed, using REST polling
  const [showDebugLog, setShowDebugLog] = useState(false); // Debug Log panel toggle (default OFF)
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const recorderRef = useRef<any>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<any>(null);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const wsFailCountRef = useRef(0);
  const restPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef(0);

  // ========== DEBUG LOG STATE ==========
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugLogRef = useRef<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const entry = `[${ts}] ${msg}`;
    debugLogRef.current = [...debugLogRef.current.slice(-19), entry];
    setDebugLogs([...debugLogRef.current]);
  }, []);

  // Intercept console.log to capture [WS] and [Chat] messages
  useEffect(() => {
    const origLog = console.log;
    const origError = console.error;
    console.log = (...args: any[]) => {
      origLog(...args);
      const str = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      if (str.includes("[WS]") || str.includes("[Chat]")) {
        addDebugLog(str);
      }
    };
    console.error = (...args: any[]) => {
      origError(...args);
      const str = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      if (str.includes("[WS]") || str.includes("[Chat]")) {
        addDebugLog("ERROR: " + str);
      }
    };
    return () => {
      console.log = origLog;
      console.error = origError;
    };
  }, [addDebugLog]);

  // ========== WebSocket connection (will auto-fallback to REST if WS fails) ==========
  const { status, send, on, connect: wsReconnect } = useWebSocket(myId, user?.openId);

  // Debug: log every status change
  useEffect(() => {
    console.log("[Chat] ====== WS STATUS CHANGED ======", status);
    if (status === "disconnected") {
      wsFailCountRef.current += 1;
      console.log("[Chat] WS fail count:", wsFailCountRef.current);
      // After 2 WS failures, switch to REST polling mode
      if (wsFailCountRef.current >= 2 && !restMode) {
        console.log("[Chat] 🔄 Switching to REST polling mode (WS unavailable)");
        setRestMode(true);
      }
    } else if (status === "connected") {
      // WS recovered! Switch back
      wsFailCountRef.current = 0;
      if (restMode) {
        console.log("[Chat] ✅ WS recovered, switching back from REST mode");
        setRestMode(false);
      }
    }
  }, [status, restMode]);

  // Log mount info
  useEffect(() => {
    console.log("[Chat] Screen mounted. myId:", myId, "friendId:", friendIdNum, "openId:", user?.openId || "none");
  }, []);

  const uploadImageMutation = trpc.chat.uploadImage.useMutation();
  const uploadAudioMutation = trpc.chat.uploadAudio.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // ========== REST API: load chat history on mount ==========
  const historyQuery = trpc.chat.history.useQuery(
    { friendId: friendIdNum, limit: 50 },
    {
      enabled: !!friendIdNum && friendIdNum > 0 && !!myId,
      refetchOnMount: true,
      staleTime: 0,
    }
  );

  // When REST history loads, populate messages
  useEffect(() => {
    if (historyQuery.data) {
      console.log("[Chat] REST API loaded history:", historyQuery.data.length, "messages");
      const sorted = [...historyQuery.data]
        .map((m: any) => ({
          ...m,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
        }))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(sorted);
      setLoading(false);
      // Track last message ID for polling
      if (sorted.length > 0) {
        lastMsgIdRef.current = Math.max(...sorted.map((m: any) => m.id));
      }
    }
  }, [historyQuery.data]);

  // ========== REST POLLING: when in REST mode, poll for new messages every 3 seconds ==========
  useEffect(() => {
    if (restMode && friendIdNum && myId) {
      console.log("[Chat] Starting REST polling (every 6s)");
      restPollRef.current = setInterval(async () => {
        try {
          await historyQuery.refetch();
        } catch (err) {
          console.error("[Chat] REST poll error:", err);
        }
      }, 6000);
    } else {
      if (restPollRef.current) {
        console.log("[Chat] Stopping REST polling");
        clearInterval(restPollRef.current);
        restPollRef.current = null;
      }
    }
    return () => {
      if (restPollRef.current) {
        clearInterval(restPollRef.current);
        restPollRef.current = null;
      }
    };
  }, [restMode, friendIdNum, myId]);

  // Request chat history on WS connect
  useEffect(() => {
    if (status === "connected" && friendIdNum) {
      console.log("[Chat] WS connected, requesting history for friend:", friendIdNum);
      send({ type: "get_history", friendId: friendIdNum, limit: 50 });
      send({ type: "mark_read", senderId: friendIdNum });
    }
  }, [status, friendIdNum, send]);

  // Timeout: stop loading spinner if nothing loads within 8 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("[Chat] Loading timeout reached (8s), stopping spinner");
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Listen for WebSocket messages (only active when WS is connected)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(on("chat_history", (msg) => {
      if (msg.friendId === friendIdNum) {
        console.log("[Chat] WS received chat_history:", (msg.messages as any[])?.length, "messages");
        const history = (msg.messages as ChatMessage[]).reverse();
        setMessages(history);
        setLoading(false);
      }
    }));

    unsubs.push(on("new_message", (msg) => {
      const newMsg = msg.message as ChatMessage;
      console.log("[Chat] Received new_message:", newMsg?.id, "from:", newMsg?.senderId, "to:", newMsg?.receiverId);
      if (
        (newMsg.senderId === friendIdNum && newMsg.receiverId === myId) ||
        (newMsg.senderId === myId && newMsg.receiverId === friendIdNum)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.senderId === friendIdNum) {
          send({ type: "mark_read", senderId: friendIdNum });
        }
      }
    }));

    unsubs.push(on("typing", (msg) => {
      if (msg.senderId === friendIdNum) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    }));

    unsubs.push(on("messages_read", (msg) => {
      if (msg.readerId === friendIdNum) {
        console.log("[Chat] Messages read by friend:", friendIdNum);
        setMessages((prev) =>
          prev.map((m) => (m.senderId === myId ? { ...m, isRead: true } : m))
        );
      }
    }));

    unsubs.push(on("auth_success", () => {
      console.log("[Chat] WS auth_success, requesting history...");
      send({ type: "get_history", friendId: friendIdNum, limit: 50 });
      send({ type: "mark_read", senderId: friendIdNum });
    }));

    return () => {
      unsubs.forEach((u) => u());
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [on, friendIdNum, myId, send]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Close emoji picker when keyboard shows
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setShowEmojiPicker(false);
    });
    return () => sub.remove();
  }, []);

  // Cleanup recording and audio player on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.remove?.(); } catch {}
      }
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const anim = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // ========== SEND MESSAGE: WS if connected, REST fallback otherwise ==========
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !friendIdNum) return;

    // Try WS first
    if (status === "connected") {
      console.log("[Chat] Sending via WS to", friendIdNum, ":", text.substring(0, 50));
      const sent = send({
        type: "send_message",
        receiverId: friendIdNum,
        message: text,
        messageType: "text",
      });
      console.log("[Chat] WS send result:", sent);
      if (sent) {
        setInputText("");
        setShowEmojiPicker(false);
        return;
      }
    }

    // REST fallback
    console.log("[Chat] Sending via REST to", friendIdNum, ":", text.substring(0, 50));
    try {
      const savedMsg = await sendMessageMutation.mutateAsync({
        receiverId: friendIdNum,
        message: text,
        messageType: "text",
      });
      console.log("[Chat] REST send success, msgId:", savedMsg?.id);
      // Add message to local state immediately
      if (savedMsg) {
        const newMsg: ChatMessage = {
          id: savedMsg.id,
          senderId: myId,
          receiverId: friendIdNum,
          message: savedMsg.message,
          messageType: savedMsg.messageType,
          isRead: false,
          createdAt: typeof savedMsg.createdAt === "string" ? savedMsg.createdAt : new Date(savedMsg.createdAt).toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      setInputText("");
      setShowEmojiPicker(false);
    } catch (err: any) {
      console.error("[Chat] REST send failed:", err);
      Alert.alert(
        (t as any).chatNetworkUnstable || "Failed to send",
        err?.message || "Please try again"
      );
    }
  }, [inputText, friendIdNum, send, status, t, sendMessageMutation, myId]);

  const handleTyping = useCallback((text: string) => {
    setInputText(text);
    if (text.length > 0 && friendIdNum && status === "connected") {
      send({ type: "typing", receiverId: friendIdNum });
    }
  }, [friendIdNum, send, status]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputText((prev) => prev + emoji);
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setTimeout(() => setShowEmojiPicker(true), 100);
    }
  }, [showEmojiPicker]);

  // Upload and send image helper — with REST fallback
  const uploadAndSendImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert(
        (t as any).error || "Error",
        (t as any).chatImageTooLarge || "Image too large (max 5MB)"
      );
      return;
    }

    if (!asset.base64) {
      Alert.alert((t as any).error || "Error", (t as any).chatImageFailed || "Failed to send image");
      return;
    }

    setUploadingImage(true);
    setShowEmojiPicker(false);

    try {
      const mimeType = asset.mimeType || "image/jpeg";
      const { url } = await uploadImageMutation.mutateAsync({
        base64: asset.base64,
        mimeType,
      });

      console.log("[Chat] Image uploaded, url:", url);

      // Try WS first, then REST
      if (status === "connected") {
        send({
          type: "send_message",
          receiverId: friendIdNum,
          message: url,
          messageType: "image",
        });
      } else {
        console.log("[Chat] Sending image via REST");
        const savedMsg = await sendMessageMutation.mutateAsync({
          receiverId: friendIdNum,
          message: url,
          messageType: "image",
        });
        if (savedMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === savedMsg.id)) return prev;
            return [...prev, {
              id: savedMsg.id,
              senderId: myId,
              receiverId: friendIdNum,
              message: savedMsg.message,
              messageType: savedMsg.messageType,
              isRead: false,
              createdAt: typeof savedMsg.createdAt === "string" ? savedMsg.createdAt : new Date(savedMsg.createdAt).toISOString(),
            }];
          });
        }
      }
    } catch (err: any) {
      console.error("[Chat] Image upload failed:", err);
      Alert.alert(
        (t as any).error || "Error",
        (t as any).chatImageFailed || "Failed to send image"
      );
    } finally {
      setUploadingImage(false);
    }
  }, [friendIdNum, send, t, uploadImageMutation, status, sendMessageMutation, myId]);

  // Pick image from gallery
  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;
      await uploadAndSendImage(result.assets[0]);
    } catch (err: any) {
      console.error("[Chat] Image pick failed:", err);
    }
  }, [uploadAndSendImage]);

  // Take photo with camera
  const handleTakePhoto = useCallback(async () => {
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== "granted") {
        Alert.alert(
          (t as any).error || "Error",
          (t as any).chatCameraPermission || "Camera permission required"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;
      await uploadAndSendImage(result.assets[0]);
    } catch (err: any) {
      console.error("[Chat] Camera failed:", err);
    }
  }, [uploadAndSendImage, t]);

  // Show attachment action sheet (camera or gallery)
  const handleAttachment = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            (t as any).cancel || "Cancel",
            (t as any).chatAttachCamera || "Take Photo",
            (t as any).chatAttachGallery || "Choose from Gallery",
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleTakePhoto();
          if (buttonIndex === 2) handlePickImage();
        }
      );
    } else {
      Alert.alert(
        (t as any).chatAttachTitle || "Send attachment",
        undefined,
        [
          { text: (t as any).cancel || "Cancel", style: "cancel" },
          { text: (t as any).chatAttachCamera || "Take Photo", onPress: handleTakePhoto },
          { text: (t as any).chatAttachGallery || "Choose from Gallery", onPress: handlePickImage },
        ]
      );
    }
  }, [handleTakePhoto, handlePickImage, t]);

  // Voice recording — with REST fallback for sending
  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Info", "Voice messages are not supported on web");
      return;
    }

    try {
      const ExpoAudio = await import("expo-audio");

      const permResult = await ExpoAudio.requestRecordingPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          (t as any).error || "Error",
          (t as any).chatVoicePermission || "Microphone permission required"
        );
        return;
      }

      await ExpoAudio.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      const AudioRecorderClass = (ExpoAudio.AudioModule as any).AudioRecorder;
      const recorder = new AudioRecorderClass(ExpoAudio.RecordingPresets.HIGH_QUALITY);
      recorderRef.current = recorder;

      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setRecordingDuration(0);
      setShowEmojiPicker(false);
      Keyboard.dismiss();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[Chat] Recording start failed:", err);
      Alert.alert((t as any).error || "Error", "Failed to start recording");
    }
  }, [t]);

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const recorder = recorderRef.current;
      await recorder.stop();
      const uri = recorder.uri;
      const duration = recordingDuration;

      setIsRecording(false);
      setRecordingDuration(0);

      if (duration < 1) {
        Alert.alert("", (t as any).chatVoiceTooShort || "Too short, hold longer");
        try { recorder.remove?.(); } catch {}
        recorderRef.current = null;
        return;
      }

      setUploadingAudio(true);

      if (!uri) {
        setUploadingAudio(false);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { url } = await uploadAudioMutation.mutateAsync({
        base64,
        duration,
      });

      console.log("[Chat] Audio uploaded, sending to", friendIdNum);
      const audioMessage = `${url}|${duration}`;

      // Try WS first, then REST
      if (status === "connected") {
        send({
          type: "send_message",
          receiverId: friendIdNum,
          message: audioMessage,
          messageType: "audio",
        });
      } else {
        console.log("[Chat] Sending audio via REST");
        const savedMsg = await sendMessageMutation.mutateAsync({
          receiverId: friendIdNum,
          message: audioMessage,
          messageType: "audio",
        });
        if (savedMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === savedMsg.id)) return prev;
            return [...prev, {
              id: savedMsg.id,
              senderId: myId,
              receiverId: friendIdNum,
              message: savedMsg.message,
              messageType: savedMsg.messageType,
              isRead: false,
              createdAt: typeof savedMsg.createdAt === "string" ? savedMsg.createdAt : new Date(savedMsg.createdAt).toISOString(),
            }];
          });
        }
      }

      try { recorder.remove?.(); } catch {}
      recorderRef.current = null;
      setUploadingAudio(false);
    } catch (err: any) {
      console.error("[Chat] Recording stop/upload failed:", err);
      setIsRecording(false);
      setUploadingAudio(false);
      setRecordingDuration(0);
      Alert.alert(
        (t as any).error || "Error",
        (t as any).chatVoiceFailed || "Failed to send voice"
      );
    }
  }, [recordingDuration, friendIdNum, send, t, uploadAudioMutation, status, sendMessageMutation, myId]);

  const cancelRecording = useCallback(async () => {
    if (!recorderRef.current) return;
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await recorderRef.current.stop();
      try { recorderRef.current.remove?.(); } catch {}
      recorderRef.current = null;
    } catch {}
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  // Play audio message
  const handlePlayAudio = useCallback(async (msgId: number, audioUrl: string) => {
    if (Platform.OS === "web") return;

    try {
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.remove?.();
        } catch {}
        audioPlayerRef.current = null;
      }

      if (playingAudioId === msgId) {
        setPlayingAudioId(null);
        return;
      }

      const ExpoAudioPlay = await import("expo-audio");
      await ExpoAudioPlay.setAudioModeAsync({ playsInSilentMode: true });

      const player = ExpoAudioPlay.createAudioPlayer({ uri: audioUrl });
      audioPlayerRef.current = player;
      setPlayingAudioId(msgId);

      player.play();

      const checkInterval = setInterval(() => {
        if (!player.playing) {
          clearInterval(checkInterval);
          setPlayingAudioId(null);
          try { player.remove?.(); } catch {}
          audioPlayerRef.current = null;
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        setPlayingAudioId(null);
        try { player.pause(); player.remove?.(); } catch {}
        audioPlayerRef.current = null;
      }, 300000);
    } catch (err: any) {
      console.error("[Chat] Audio playback failed:", err);
      setPlayingAudioId(null);
    }
  }, [playingAudioId]);

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return (t as any).chatJustNow || "Just now";
    if (diffMins < 60) return `${diffMins} ${(t as any).chatMinutesAgo || "min ago"}`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return timeStr;
    if (isYesterday) return `${(t as any).chatYesterday || "Yesterday"} ${timeStr}`;
    return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
  }, [t]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === myId;
    const isImage = item.messageType === "image";
    const isAudio = item.messageType === "audio";

    let audioUrl = "";
    let audioDuration = 0;
    if (isAudio) {
      const parts = item.message.split("|");
      audioUrl = parts[0] || item.message;
      audioDuration = parseInt(parts[1] || "0", 10);
    }

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View
          style={[
            styles.msgBubble,
            isImage && styles.msgBubbleImage,
            isAudio && styles.msgBubbleAudio,
            isMe
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {isImage ? (
            <TouchableOpacity
              onPress={() => setPreviewImage(item.message)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.message }}
                style={styles.chatImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          ) : isAudio ? (
            <TouchableOpacity
              onPress={() => handlePlayAudio(item.id, audioUrl)}
              activeOpacity={0.7}
              style={styles.audioRow}
            >
              <View style={[styles.audioPlayBtn, { backgroundColor: isMe ? "rgba(255,255,255,0.2)" : colors.primary + "20" }]}>
                <IconSymbol
                  name={playingAudioId === item.id ? "pause.fill" : "play.fill"}
                  size={20}
                  color={isMe ? "#fff" : colors.primary}
                />
              </View>
              <View style={styles.audioWaveContainer}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const height = 8 + Math.sin(i * 0.8 + item.id) * 8;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.audioWaveBar,
                        {
                          height,
                          backgroundColor: isMe ? "rgba(255,255,255,0.5)" : colors.primary + "60",
                          opacity: playingAudioId === item.id ? 1 : 0.6,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={[styles.audioDuration, { color: isMe ? "rgba(255,255,255,0.7)" : colors.muted }]}>
                {formatDuration(audioDuration)}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>
              {item.message}
            </Text>
          )}
          <View style={styles.msgMeta}>
            {isMe && item.isRead && (
              <Text style={[styles.readIndicator, { color: isMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
                ✓✓
              </Text>
            )}
            <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [colors, myId, formatTime, formatDuration, handlePlayAudio, playingAudioId]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyDesc, { color: colors.muted, marginTop: 12 }]}>
            {(t as any).chatLoading || "Loading..."}
          </Text>
        </View>
      );
    }
    if (messages.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {(t as any).chatNoMessages || "No messages yet"}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            {(t as any).chatStartConversation || "Say hi to start the conversation!"}
          </Text>
        </View>
      );
    }
    return null;
  }, [loading, colors, t, messages.length]);

  // Status display: REST mode shows as "Connected" (user doesn't need to know the mode)
  const statusText = (restMode || status === "connected")
    ? ((t as any).chatConnected || "Connected")
    : status === "connecting"
    ? ((t as any).chatConnecting || "Connecting...")
    : ((t as any).chatDisconnected || "Disconnected");

  const statusColor = (restMode || status === "connected") ? colors.success : status === "connecting" ? colors.warning : colors.error;

  // In REST mode or WS connected, user can send messages
  const canSend = status === "connected" || restMode;

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View
          style={[
            styles.chatHeader,
            { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 44) + 8 },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              if (router.canDismiss()) router.dismiss();
              else router.back();
            }}
            style={styles.backBtn}
          >
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: colors.foreground }]}>
              {friendName || "Friend"}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                {isTyping ? ((t as any).chatTyping || "typing...") : statusText}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty,
            ]}
            ListEmptyComponent={renderEmpty}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        </View>

        {/* Uploading indicator */}
        {(uploadingImage || uploadingAudio) && (
          <View style={[styles.uploadingBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.uploadingText, { color: colors.muted }]}>
              {uploadingAudio
                ? ((t as any).chatVoiceSending || "Sending voice...")
                : ((t as any).chatImageSending || "Sending image...")}
            </Text>
          </View>
        )}

        {/* Recording overlay */}
        {isRecording && (
          <View style={[styles.recordingBar, { backgroundColor: colors.error + "15", borderTopColor: colors.error + "30" }]}>
            <RNAnimated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.recordingText, { color: colors.error }]}>
              {(t as any).chatVoiceRecording || "Recording..."} {formatDuration(recordingDuration)}
            </Text>
            <View style={styles.recordingActions}>
              <TouchableOpacity onPress={cancelRecording} style={[styles.recordingCancelBtn, { backgroundColor: colors.surface }]}>
                <IconSymbol name="xmark" size={18} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRecording} style={[styles.recordingSendBtn, { backgroundColor: colors.primary }]}>
                <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Debug Log Toggle Button (small, bottom-right of messages area) */}
        <TouchableOpacity
          onPress={() => setShowDebugLog(!showDebugLog)}
          style={[styles.debugToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.debugToggleText, { color: colors.muted }]}>
            {showDebugLog ? "Hide Log" : "🐛 Debug"}
          </Text>
        </TouchableOpacity>

        {/* Debug Log Panel (hidden by default) */}
        {showDebugLog && (
          <View style={[styles.debugPanel, { backgroundColor: "#1a1a2e", borderTopColor: colors.border }]}>
            <View style={styles.debugHeader}>
              <Text style={styles.debugTitle}>Debug Log ({debugLogs.length}) {restMode ? "📡 REST" : status === "connected" ? "🟢 WS" : "🔴 WS"}</Text>
              <TouchableOpacity onPress={() => { debugLogRef.current = []; setDebugLogs([]); }}>
                <Text style={styles.debugClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              {debugLogs.length === 0 ? (
                <Text style={styles.debugText}>Waiting for logs...</Text>
              ) : (
                debugLogs.map((log, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.debugText,
                      log.includes("AUTH SUCCESS") && { color: "#4ade80" },
                      log.includes("DISCONNECTED") && { color: "#f87171" },
                      log.includes("ERROR") && { color: "#f87171" },
                      log.includes("STATUS CHANGED") && { color: "#60a5fa" },
                      log.includes("TCP CONNECTED") && { color: "#4ade80" },
                      log.includes("Connecting to") && { color: "#fbbf24" },
                      log.includes("REST") && { color: "#c084fc" },
                      log.includes("Switching") && { color: "#c084fc" },
                    ]}
                  >
                    {log}
                  </Text>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        {!isRecording && (
          <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {/* Emoji toggle button */}
            <TouchableOpacity
              onPress={toggleEmojiPicker}
              style={styles.iconBtn}
              activeOpacity={0.6}
            >
              <IconSymbol
                name={showEmojiPicker ? "chevron.left.forwardslash.chevron.right" : "face.smiling"}
                size={24}
                color={showEmojiPicker ? colors.primary : colors.muted}
              />
            </TouchableOpacity>

            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
              ]}
              placeholder={(t as any).chatPlaceholder || "Type a message..."}
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={handleTyping}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
              maxLength={2000}
              onFocus={() => setShowEmojiPicker(false)}
            />

            {/* Attachment button (camera + gallery) */}
            <TouchableOpacity
              onPress={handleAttachment}
              style={styles.iconBtn}
              activeOpacity={0.6}
              disabled={uploadingImage}
            >
              <IconSymbol
                name="camera"
                size={24}
                color={uploadingImage ? colors.border : colors.muted}
              />
            </TouchableOpacity>

            {/* Mic / Send button */}
            {inputText.trim() ? (
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                <IconSymbol name="paperplane.fill" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={startRecording}
                style={[styles.sendBtn, { backgroundColor: colors.surface }]}
                disabled={uploadingAudio}
              >
                <IconSymbol
                  name="mic.fill"
                  size={22}
                  color={uploadingAudio ? colors.border : colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </KeyboardAvoidingView>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={!!previewImage}
        imageUrl={previewImage || ""}
        onClose={() => setPreviewImage(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 8 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 18, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },
  messagesList: { padding: 16, gap: 4 },
  messagesListEmpty: { flex: 1 },
  msgRow: { alignItems: "flex-start", marginBottom: 8 },
  msgRowMe: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  msgBubbleImage: { padding: 4, overflow: "hidden" },
  msgBubbleAudio: { paddingVertical: 8, paddingHorizontal: 10 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, alignSelf: "flex-end" },
  readIndicator: { fontSize: 11 },
  msgTime: { fontSize: 11 },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 180,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  audioWaveContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },
  audioWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: "500",
    minWidth: 32,
    textAlign: "right",
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  recordingText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  recordingActions: {
    flexDirection: "row",
    gap: 10,
  },
  recordingCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  uploadingText: { fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  debugToggle: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 2,
  },
  debugToggleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  debugPanel: {
    maxHeight: 150,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 4,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.5,
  },
  debugClear: {
    fontSize: 11,
    color: "#60a5fa",
    fontWeight: "600",
  },
  debugScroll: {
    maxHeight: 120,
  },
  debugText: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#9ca3af",
    lineHeight: 14,
    paddingVertical: 1,
  },
});
