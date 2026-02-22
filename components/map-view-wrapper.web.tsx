import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface CalloutAction {
  label: string;
  emoji: string;
  onPress: () => void;
  color?: string;
}

export interface MapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  id?: string | number;
  showActions?: boolean;
  actions?: CalloutAction[];
}

interface MapViewWrapperProps {
  style?: any;
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  markers?: MapMarkerProps[];
  mapRef?: React.RefObject<any>;
}

export function MapViewWrapper({
  style,
  markers = [],
}: MapViewWrapperProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <View style={[styles.webMap, style]}>
      <View style={styles.webMapInner}>
        <Text style={styles.webMapIcon}>🗺️</Text>
        <Text style={styles.webMapText}>Map View</Text>
        <Text style={styles.webMapSubtext}>
          {markers.length > 0
            ? `${markers.length} location(s) on map`
            : "Open on your phone to see the real map"}
        </Text>
        {markers.map((m, i) => (
          <TouchableOpacity
            key={m.id ?? i}
            style={[styles.webMarker, { borderLeftColor: m.pinColor || "#3B82F6" }]}
            onPress={() => setExpandedIdx(expandedIdx === i ? null : i)}
            activeOpacity={0.7}
          >
            <Text style={styles.webMarkerTitle}>{m.title}</Text>
            {m.description ? (
              <Text style={styles.webMarkerDesc}>{m.description}</Text>
            ) : null}
            {expandedIdx === i && m.showActions && m.actions && m.actions.length > 0 && (
              <View style={styles.webActionsRow}>
                {m.actions.map((action, ai) => (
                  <TouchableOpacity
                    key={ai}
                    style={[styles.webActionBtn, { backgroundColor: action.color || "#3B82F6" }]}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.webActionEmoji}>{action.emoji}</Text>
                    <Text style={styles.webActionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function animateMapToRegion(
  _mapRef: React.RefObject<any>,
  _region: MapRegion,
  _duration: number = 500
) {
  // No-op on web
}

const styles = StyleSheet.create({
  webMap: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    overflow: "hidden",
  },
  webMapInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  webMapIcon: { fontSize: 40, marginBottom: 8 },
  webMapText: { fontSize: 16, fontWeight: "700", color: "#333" },
  webMapSubtext: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 12 },
  webMarker: {
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 6,
  },
  webMarkerTitle: { fontSize: 13, fontWeight: "600", color: "#333" },
  webMarkerDesc: { fontSize: 11, color: "#666", marginTop: 2 },
  webActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingBottom: 4,
  },
  webActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  webActionEmoji: { fontSize: 12 },
  webActionLabel: { fontSize: 11, fontWeight: "600", color: "#fff" },
});
