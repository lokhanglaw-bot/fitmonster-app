import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";

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

interface ClusterItem {
  type: "cluster";
  id: string;
  coordinate: { latitude: number; longitude: number };
  count: number;
  markers: MapMarkerProps[];
}

interface SingleItem {
  type: "single";
  marker: MapMarkerProps;
}

type ClusteredItem = ClusterItem | SingleItem;

interface MapViewWrapperProps {
  style?: any;
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  markers?: MapMarkerProps[];
  mapRef?: React.RefObject<any>;
  /** Enable marker clustering. Defaults to false. */
  clustering?: boolean;
}

/**
 * Simple distance-based clustering algorithm.
 * Groups markers that are within `threshold` degrees of each other.
 */
function clusterMarkers(
  markers: MapMarkerProps[],
  latDelta: number,
): ClusteredItem[] {
  if (markers.length === 0) return [];

  // Clustering threshold scales with zoom level
  // Smaller latDelta = more zoomed in = smaller threshold
  const threshold = latDelta * 0.08;

  const used = new Set<number>();
  const result: ClusteredItem[] = [];

  for (let i = 0; i < markers.length; i++) {
    if (used.has(i)) continue;

    const group: MapMarkerProps[] = [markers[i]];
    used.add(i);

    for (let j = i + 1; j < markers.length; j++) {
      if (used.has(j)) continue;

      const dLat = Math.abs(markers[i].coordinate.latitude - markers[j].coordinate.latitude);
      const dLng = Math.abs(markers[i].coordinate.longitude - markers[j].coordinate.longitude);

      if (dLat < threshold && dLng < threshold) {
        group.push(markers[j]);
        used.add(j);
      }
    }

    if (group.length === 1) {
      result.push({ type: "single", marker: group[0] });
    } else {
      // Calculate centroid
      const avgLat = group.reduce((sum, m) => sum + m.coordinate.latitude, 0) / group.length;
      const avgLng = group.reduce((sum, m) => sum + m.coordinate.longitude, 0) / group.length;
      result.push({
        type: "cluster",
        id: `cluster-${i}`,
        coordinate: { latitude: avgLat, longitude: avgLng },
        count: group.length,
        markers: group,
      });
    }
  }

  return result;
}

export function MapViewWrapper({
  style,
  initialRegion,
  showsUserLocation,
  showsMyLocationButton,
  showsCompass,
  markers = [],
  mapRef,
  clustering = false,
}: MapViewWrapperProps) {
  const [currentRegion, setCurrentRegion] = useState<MapRegion | undefined>(initialRegion);

  const handleRegionChange = useCallback((region: Region) => {
    setCurrentRegion(region);
  }, []);

  const clusteredItems = useMemo(() => {
    if (!clustering || !currentRegion) {
      return markers.map((m): ClusteredItem => ({ type: "single", marker: m }));
    }
    return clusterMarkers(markers, currentRegion.latitudeDelta);
  }, [markers, clustering, currentRegion?.latitudeDelta]);

  const handleClusterPress = useCallback((cluster: ClusterItem) => {
    if (!mapRef?.current?.animateToRegion) return;
    // Calculate bounding box of cluster markers
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const m of cluster.markers) {
      minLat = Math.min(minLat, m.coordinate.latitude);
      maxLat = Math.max(maxLat, m.coordinate.latitude);
      minLng = Math.min(minLng, m.coordinate.longitude);
      maxLng = Math.max(maxLng, m.coordinate.longitude);
    }
    const latDelta = Math.max((maxLat - minLat) * 2, 0.005);
    const lngDelta = Math.max((maxLng - minLng) * 2, 0.005);
    mapRef.current.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    }, 400);
  }, [mapRef]);

  return (
    <MapView
      ref={mapRef}
      style={style || { flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton ?? false}
      showsCompass={showsCompass ?? false}
      onRegionChangeComplete={clustering ? handleRegionChange : undefined}
    >
      {clusteredItems.map((item, i) => {
        if (item.type === "cluster") {
          return (
            <Marker
              key={item.id}
              coordinate={item.coordinate}
              onPress={() => handleClusterPress(item)}
              tracksViewChanges={false}
            >
              <View style={clusterStyles.container}>
                <View style={clusterStyles.circle}>
                  <Text style={clusterStyles.count}>{item.count}</Text>
                </View>
              </View>
            </Marker>
          );
        }

        const m = item.marker;
        return (
          <Marker
            key={m.id ?? `single-${i}`}
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
        );
      })}
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

const clusterStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  count: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});

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
