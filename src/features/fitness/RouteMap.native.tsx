import { useRef } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Constants from 'expo-constants';
import type { RoutePoint } from '../../types/life';
import { Button, Label } from '../../components/common/ui';
import { routeSegments } from './tracking';
import RouteOutline from './RouteOutline';

export default function RouteMap({ route }: { route: RoutePoint[] }) {
  const map = useRef<MapView>(null);
  if (!route.length || (Platform.OS === 'android' && !Constants.expoConfig?.extra?.androidMapsConfigured && Constants.executionEnvironment !== 'storeClient')) return <RouteOutline route={route} />;
  const first = route[0]!;
  const last = route.at(-1)!;
  return <View style={{ gap: 8 }}><MapView ref={map} style={{ height: 300, width: '100%' }} accessibilityLabel="Recorded activity route map" initialRegion={{ latitude: first.latitude, longitude: first.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
    onMapReady={() => map.current?.fitToCoordinates(route, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false })}>
    {routeSegments(route).map((segment, index) => <Polyline key={index} coordinates={segment} strokeColor="#6D3AC7" strokeWidth={4} />)}
    <Marker coordinate={first} title="Start" pinColor="green" /><Marker coordinate={last} title="Latest / finish" />
  </MapView><Button title="Show whole route" variant="ghost" onPress={() => map.current?.fitToCoordinates(route, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true })} /><Label muted size={12}>Route gaps mark pauses or missing GPS. Map tiles are supplied by Apple Maps on iOS or Google Maps on Android.</Label></View>;
}
