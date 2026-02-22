import React from "react";
import MapView, { Marker } from "react-native-maps";

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
          key={i}
          coordinate={m.coordinate}
          title={m.title}
          description={m.description}
          pinColor={m.pinColor}
        />
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
