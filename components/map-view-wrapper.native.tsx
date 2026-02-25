import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";

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
  /** Unique identifier for the marker (e.g. userId) */
  id?: string | number;
  /** If true, show custom callout with action buttons */
  showActions?: boolean;
  /** Action buttons to show in the callout */
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
  initialRegion,
  showsUserLocation,
  showsMyLocationButton,
  showsCompass,
  markers = [],
  mapRef,
}: MapViewWrapperProps) {
  return (
    <MapView
      ref={mapRef}
      style={style || { flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton ?? false}
      showsCompass={showsCompass ?? false}
    >
      {markers.map((m, i) => (
        <Marker
          key={m.id ?? i}
          coordinate={m.coordinate}
          title={m.showActions ? undefined : m.title}
          description={m.showActions ? undefined : m.description}
          pinColor={m.pinColor}
        >
          {m.showActions && m.actions && m.actions.length > 0 ? (
            <Callout tooltip>
              <View style={calloutStyles.container}>
                <Text style={calloutStyles.title} numberOfLines={1}>
                  {m.title}
                </Text>
                {m.description ? (
                  <Text style={calloutStyles.description} numberOfLines={2}>
                    {m.description}
                  </Text>
                ) : null}
                <View style={calloutStyles.actionsRow}>
                  {m.actions.map((action, ai) => (
                    <TouchableOpacity
                      key={ai}
                      style={[
                        calloutStyles.actionBtn,
                        { backgroundColor: action.color || "#3B82F6" },
                      ]}
                      onPress={action.onPress}
                      activeOpacity={0.7}
                    >
                      <Text style={calloutStyles.actionEmoji}>{action.emoji}</Text>
                      <Text style={calloutStyles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={calloutStyles.arrow} />
              </View>
            </Callout>
          ) : null}
        </Marker>
      ))}
    </MapView>
  );
}

export function animateMapToRegion(
  mapRef: React.RefObject<any>,
  region: MapRegion,
  duration: number = 500
) {
  if (mapRef.current?.animateToRegion) {
    mapRef.current.animateToRegion(region, duration);
  }
}

const calloutStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    minWidth: 180,
    maxWidth: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  actionEmoji: {
    fontSize: 14,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  arrow: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
  },
});
