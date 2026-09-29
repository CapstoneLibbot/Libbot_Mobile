import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, spacing } from '../../theme';

export function MobileMap(): React.ReactElement {
  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 10.7769,
          longitude: 106.7009,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        }}
        showsUserLocation
        showsCompass
      >
        <Marker
          coordinate={{ latitude: 10.7769, longitude: 106.7009 }}
          title="Reading area"
          description="Quiet reading zone"
        />
        <Marker
          coordinate={{ latitude: 10.7775, longitude: 106.7002 }}
          title="LiBot"
          description="Robot guidance position"
          pinColor={colors.primary}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
  },
  map: {
    flex: 1,
  },
});

