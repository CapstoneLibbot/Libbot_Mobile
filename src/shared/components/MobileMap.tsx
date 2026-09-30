import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { colors } from '../theme';

export interface MapMarkerItem {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
  pinColor?: string;
}

export interface MobileMapProps {
  markers?: MapMarkerItem[];
  initialRegion?: Region;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_REGION: Region = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

export function MobileMap({
  markers = [],
  initialRegion = DEFAULT_REGION,
  interactive = true,
  style,
}: MobileMapProps): React.ReactElement {
  return (
    <View style={[styles.mapContainer, style]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        showsCompass
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor ?? colors.primary}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  map: {
    flex: 1,
  },
});
