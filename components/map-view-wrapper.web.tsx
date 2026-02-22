import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

interface MapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
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
          <View key={i} style={[styles.webMarker, { borderLeftColor: m.pinColor || "#3B82F6" }]}>
            <Text style={styles.webMarkerTitle}>{m.title}</Text>
            {m.description ? (
              <Text style={styles.webMarkerDesc}>{m.description}</Text>
            ) : null}
          </View>
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
});
