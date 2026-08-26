import { Tabs, Redirect, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionStore } from '@/store/session';

function DouyinTabBar({
  state,
  navigation,
}: {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}) {
  const insets = useSafeAreaInsets();
  const routeName = state.routes[state.index]?.name;
  const isHome = routeName === 'feed';

  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(insets.bottom, 8) },
        isHome ? styles.tabBarDark : styles.tabBarLight,
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (route.name === 'upload') {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.centerSlot}>
              <View style={[styles.plusBtn, !isHome && styles.plusBtnLight]}>
                <Text style={[styles.plusText, !isHome && styles.plusTextLight]}>+</Text>
              </View>
            </Pressable>
          );
        }

        const label =
          route.name === 'feed'
            ? '首页'
            : route.name === 'friends'
              ? '朋友'
              : route.name === 'messages'
                ? '消息'
                : '我';

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <View style={styles.tabItemInner}>
              <Text
                style={[
                  styles.tabLabel,
                  !isHome && styles.tabLabelOnLight,
                  focused && (isHome ? styles.tabLabelActive : styles.tabLabelActiveLight),
                ]}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const accessToken = useSessionStore((state) => state.accessToken);

  if (!hydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href={'/(auth)/login' as Href} />;
  }

  return (
    <Tabs
      initialRouteName="feed"
      tabBar={(props) => (
        <DouyinTabBar state={props.state} navigation={props.navigation as never} />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="upload" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarDark: {
    backgroundColor: '#000',
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  tabBarLight: {
    backgroundColor: '#fff',
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  tabItemInner: {
    position: 'relative',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 15,
    color: '#8a8a8a',
    fontWeight: '500',
  },
  tabLabelOnLight: {
    color: '#8a8a8a',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabLabelActiveLight: {
    color: '#161823',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -14,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fe2c55',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  centerSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtn: {
    width: 48,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderLeftColor: '#20d5ec',
    borderRightColor: '#fe2c55',
    borderTopColor: '#fff',
    borderBottomColor: '#fff',
  },
  plusBtnLight: {
    backgroundColor: '#161823',
    borderTopColor: '#161823',
    borderBottomColor: '#161823',
  },
  plusText: {
    color: '#161823',
    fontSize: 26,
    fontWeight: '600',
    marginTop: -2,
  },
  plusTextLight: {
    color: '#fff',
  },
});
