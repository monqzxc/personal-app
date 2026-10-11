import { useContext, useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { LIQUID_BAR_TOP, liquidBarHeight, liquidBodyHeight, liquidTabGeometry, type LiquidTabGeometry } from './liquidTabGeometry';

type Props = BottomTabBarProps & { keyboardVisible: boolean; reducedMotion: boolean };

function LiquidShape({ geometry: g, position, ripple, direction }: { geometry: LiquidTabGeometry; position: SharedValue<number>; ripple: SharedValue<number>; direction: SharedValue<number> }) {
  const { colors } = useTheme();
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: g.first + position.value * g.step }] }));
  const hollow = useAnimatedStyle(() => {
    const wave = Math.max(0, Math.min(1, ripple.value));
    const r = g.notchRadius + wave * 5;
    const shoulder = g.shoulder - wave * 4;
    return { left: -r, width: 2 * r, height: r + shoulder, borderBottomLeftRadius: r, borderBottomRightRadius: r };
  });
  const left = useAnimatedStyle(() => {
    const wave = Math.max(0, Math.min(1, ripple.value));
    const r = g.notchRadius + wave * 5;
    const shoulder = g.shoulder - wave * 4;
    return { left: -r - shoulder, width: shoulder, height: shoulder };
  });
  const right = useAnimatedStyle(() => {
    const wave = Math.max(0, Math.min(1, ripple.value));
    const shoulder = g.shoulder - wave * 4;
    return { left: g.notchRadius + wave * 5, width: shoulder, height: shoulder };
  });
  const leftCurve = useAnimatedStyle(() => ({ borderTopRightRadius: g.shoulder - Math.max(0, Math.min(1, ripple.value)) * 4 }));
  const rightCurve = useAnimatedStyle(() => ({ borderTopLeftRadius: g.shoulder - Math.max(0, Math.min(1, ripple.value)) * 4 }));
  const bubble = useAnimatedStyle(() => {
    const wave = Math.max(0, Math.min(1, ripple.value));
    const half = g.bubbleSize / 2;
    return { borderTopLeftRadius: half - wave * 8, borderTopRightRadius: half - wave * 2,
      borderBottomLeftRadius: half - wave * 2, borderBottomRightRadius: half - wave * 8,
      transform: [{ translateX: g.first + position.value * g.step - half }, { translateY: -wave * 4 },
        { rotate: `${direction.value * wave * 6}deg` }, { scaleX: 1 + wave * 0.12 }, { scaleY: 1 - wave * 0.1 }] };
  });
  const centerY = LIQUID_BAR_TOP + (g.compact ? 24 : g.shoulder - 2);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
    {!g.compact && <Animated.View style={[{ position: 'absolute', top: LIQUID_BAR_TOP, left: 0 }, moving]}>
      <Animated.View style={[{ position: 'absolute', top: 0, backgroundColor: colors.background }, hollow]} />
      <Animated.View style={[{ position: 'absolute', top: 0, backgroundColor: colors.background }, left]}>
        <Animated.View style={[{ flex: 1, backgroundColor: colors.hero }, leftCurve]} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 0, backgroundColor: colors.background }, right]}>
        <Animated.View style={[{ flex: 1, backgroundColor: colors.hero }, rightCurve]} />
      </Animated.View>
    </Animated.View>}
    <Animated.View style={[{ position: 'absolute', top: centerY - g.bubbleSize / 2, left: 0, width: g.bubbleSize, height: g.bubbleSize,
      backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.accent,
      boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 12, color: `${colors.primary}66` }] }, bubble]} />
  </View>;
}

function LiquidTabItem({ index, geometry: g, position, state, descriptors, navigation, bodyHeight }: Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'> & { index: number; geometry: LiquidTabGeometry; position: SharedValue<number>; bodyHeight: number }) {
  const { colors } = useTheme();
  const route = state.routes[index]!;
  const { options } = descriptors[route.key]!;
  const focused = state.index === index;
  const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
  const lift = g.compact ? 0 : 26 - g.shoulder;
  const iconMotion = useAnimatedStyle(() => {
    const active = Math.max(0, 1 - Math.abs(position.value - index));
    return { transform: [{ translateY: -lift * active }, { scale: 1 + active * 0.06 }] };
  });
  const mutedIcon = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(position.value - index)) }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(position.value - index)) }));
  return <Pressable accessibilityRole="tab" accessibilityLabel={options.tabBarAccessibilityLabel ?? label} accessibilityState={{ selected: focused }} testID={options.tabBarButtonTestID}
    onPress={() => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    }}
    onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
    style={({ pressed }) => ({ position: 'absolute', top: 0, left: g.centers[index]! - g.touchWidth / 2, width: g.touchWidth, height: LIQUID_BAR_TOP + bodyHeight, alignItems: 'center', zIndex: 2, opacity: pressed ? 0.7 : 1 })}>
    <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', top: LIQUID_BAR_TOP + 10, width: 28, height: 28 }, iconMotion]}>
      <Animated.View style={[{ position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, mutedIcon]}>{options.tabBarIcon?.({ focused: false, color: colors.heroMuted, size: 24 })}</Animated.View>
      <Animated.View style={[{ position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, activeIcon]}>{options.tabBarIcon?.({ focused: true, color: colors.onPrimary, size: 24 })}</Animated.View>
    </Animated.View>
    <Text numberOfLines={1} style={{ position: 'absolute', bottom: 10, left: 1, right: 1, textAlign: 'center', fontSize: 11, lineHeight: 16, color: focused ? colors.onHero : colors.heroMuted, fontWeight: focused ? '700' : '400' }}>{label}</Text>
  </Pressable>;
}

export function LiquidTabBar({ keyboardVisible, reducedMotion, ...props }: Props) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(props.state.index);
  const ripple = useSharedValue(0);
  const direction = useSharedValue(1);
  const height = liquidBarHeight(props.insets.bottom, fontScale);
  const bodyHeight = liquidBodyHeight(fontScale);
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const geometry = liquidTabGeometry(width || 320, props.state.routes.length);
  useEffect(() => { reportHeight?.(keyboardVisible ? 0 : height); }, [reportHeight, height, keyboardVisible]);
  useEffect(() => {
    cancelAnimation(position); cancelAnimation(ripple);
    if (reducedMotion || position.value === props.state.index) {
      position.value = props.state.index; ripple.value = 0;
    } else {
      // The live accessibility preference above also handles changes after app launch.
      direction.value = props.state.index > position.value ? 1 : -1;
      position.value = withSpring(props.state.index, { stiffness: 190, damping: 22, mass: 0.8, overshootClamping: true, reduceMotion: ReduceMotion.Never });
      ripple.value = withSequence(ReduceMotion.Never, withTiming(1, { duration: 110, reduceMotion: ReduceMotion.Never }), withSpring(0, { stiffness: 180, damping: 13, mass: 0.65, reduceMotion: ReduceMotion.Never }));
    }
    return () => { cancelAnimation(position); cancelAnimation(ripple); };
  }, [props.state.index, reducedMotion, position, ripple, direction]);
  if (keyboardVisible) return null;
  return <View pointerEvents="box-none" style={{ height, paddingLeft: props.insets.left + 12, paddingRight: props.insets.right + 12, paddingBottom: Math.max(12, props.insets.bottom) + 8, backgroundColor: colors.background }}>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', maxWidth: 560, alignSelf: 'center', height: LIQUID_BAR_TOP + bodyHeight }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: LIQUID_BAR_TOP, left: 0, right: 0, height: bodyHeight, borderRadius: geometry.corner, backgroundColor: colors.hero,
        boxShadow: '0px 6px 16px rgba(12, 3, 24, 0.22)' }} />
      {width > 0 && <>
        <LiquidShape geometry={geometry} position={position} ripple={ripple} direction={direction} />
        {props.state.routes.map((route, index) => <LiquidTabItem key={route.key} {...props} index={index} geometry={geometry} position={position} bodyHeight={bodyHeight} />)}
      </>}
    </View>
  </View>;
}
