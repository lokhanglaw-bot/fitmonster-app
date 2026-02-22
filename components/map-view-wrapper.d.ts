import React from "react";

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

export function MapViewWrapper(props: MapViewWrapperProps): React.JSX.Element;
export function animateMapToRegion(
  mapRef: React.RefObject<any>,
  region: MapRegion,
  duration?: number
): void;
