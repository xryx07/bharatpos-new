import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import BharatPOSShowcase from '../components/BharatPOSShowcase';
import { Stack } from 'expo-router';

export default function ShowcaseScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: 'BharatPOS - Complete Ecosystem Showcase' }} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrap}>
          <BharatPOSShowcase />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  contentWrap: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
