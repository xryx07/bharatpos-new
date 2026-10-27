import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AdminScreen() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('ownerBypass', 'true');
      router.replace('/(owner)' as any);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.iconCircle}>
          <Icon name="view-dashboard" size={36} color="#16A34A" />
        </View>
        <Text style={styles.title}>BharatPOS Admin Dashboard</Text>
        <Text style={styles.subtitle}>Directing to store management & billing terminal...</Text>
        <ActivityIndicator size="small" color="#16A34A" style={{ marginVertical: 18 }} />
        <Button 
          mode="contained" 
          buttonColor="#16A34A" 
          style={styles.btn} 
          labelStyle={{ fontWeight: 'bold' }}
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.localStorage.setItem('ownerBypass', 'true');
            }
            router.replace('/(owner)' as any);
          }}
        >
          Open Admin Dashboard
        </Button>
        <Button 
          mode="outlined" 
          textColor="#64748B" 
          style={{ marginTop: 12, width: '100%', borderColor: '#CBD5E1' }}
          labelStyle={{ fontWeight: '600' }}
          onPress={() => router.replace('/' as any)}
        >
          Back to Homepage
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 36,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Plus Jakarta Sans',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  btn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 4,
  },
});
