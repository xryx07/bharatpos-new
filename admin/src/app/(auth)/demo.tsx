import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function BookDemoRedirect() {
  useEffect(() => {
    router.replace('/(auth)/login' as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0A09', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#F59E0B" />
    </View>
  );
}
