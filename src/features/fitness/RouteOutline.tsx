import { useState } from 'react';
import { View } from 'react-native';
import type { RoutePoint } from '../../types/life';
import { Label } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';

export default function RouteOutline({ route }: { route: RoutePoint[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(280);
  if (!route.length) return <Label muted>No GPS route yet. Manual activities do not include a route.</Label>;
  const first = route[0]!;
  const projected = route.map(point => ({ x: (((point.longitude - first.longitude + 540) % 360) - 180) * Math.cos(first.latitude * Math.PI / 180), y: -point.latitude, point }));
  const minX = Math.min(...projected.map(point => point.x));
  const minY = Math.min(...projected.map(point => point.y));
  const dx = Math.max(...projected.map(point => point.x)) - minX;
  const dy = Math.max(...projected.map(point => point.y)) - minY;
  const scale = Math.min((width - 40) / Math.max(dx, 0.00001), 190 / Math.max(dy, 0.00001));
  // shortcut: sample only the drawing for long routes; recorded coordinates and distance stay intact.
  const step = Math.max(1, Math.ceil(projected.length / 300));
  const points = projected.filter((_, index) => index % step === 0 || index === projected.length - 1).map(item => ({ ...item, x: (item.x - minX) * scale + (width - dx * scale) / 2, y: (item.y - minY) * scale + (230 - dy * scale) / 2 }));
  return <View style={{ gap: 8 }}><View accessibilityLabel="Recorded route outline. Purple start, red end. Gaps represent pauses or missing GPS." onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height: 230, backgroundColor: colors.surfaceAlt, borderRadius: 12, overflow: 'hidden' }}>
    {points.slice(1).map((point, index) => {
      const previous = points[index]!;
      if (point.point.segment !== previous.point.segment) return null;
      const length = Math.hypot(point.x - previous.x, point.y - previous.y);
      return <View key={point.point.timestamp} style={{ position: 'absolute', left: (point.x + previous.x - length) / 2, top: (point.y + previous.y) / 2, width: length, height: 3, backgroundColor: colors.primary, transform: [{ rotate: `${Math.atan2(point.y - previous.y, point.x - previous.x)}rad` }] }} />;
    })}
    {[points[0]!, points.at(-1)!].map((point, index) => <View key={index} style={{ position: 'absolute', left: point.x - 5, top: point.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: index ? colors.danger : colors.primary }} />)}
  </View><Label muted size={12}>Route outline · start purple, end red · {route.length} saved points. Street maps are available in the phone app when configured.</Label></View>;
}
