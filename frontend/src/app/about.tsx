import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AboutScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth > 960;

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.brandRow} activeOpacity={0.85}>
          <View style={styles.brandIconCircle}>
            <Icon name="cash-register" size={22} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.brandTitle}>BharatPOS</Text>
            <Text style={styles.brandSubtitle}>Simple. Smart. For Every Business.</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.navRight}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.navLink}>
            <Text style={styles.navLinkText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} style={styles.getStartedBtn}>
            <Text style={styles.getStartedBtnText}>Get Started Free</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollWrap} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainSection, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          
          {/* Left Column: Story & Mission */}
          <View style={[styles.leftCol, { width: isDesktop ? '56%' : '100%' }]}>
            <Text style={styles.aboutMainTitle}>About BharatPOS</Text>
            <Text style={styles.aboutSubTitle}>Building the Future of Business Operations</Text>
            
            <Text style={styles.aboutStoryText}>
              BharatPOS is a next-generation cloud-based POS and inventory management platform designed for Indian businesses. We help retailers, wholesalers, and restaurants simplify their operations, increase efficiency and grow faster — with powerful, easy-to-use solutions.
            </Text>

            <Text style={styles.aboutMissionTitle}>Our Mission</Text>
            <View style={styles.missionList}>
              <View style={styles.missionItem}>
                <View style={styles.checkCircle}>
                  <Icon name="check" size={14} color="#16A34A" />
                </View>
                <Text style={styles.missionText}>Empower small & medium businesses</Text>
              </View>
              <View style={styles.missionItem}>
                <View style={styles.checkCircle}>
                  <Icon name="check" size={14} color="#16A34A" />
                </View>
                <Text style={styles.missionText}>Make operations simple & efficient</Text>
              </View>
              <View style={styles.missionItem}>
                <View style={styles.checkCircle}>
                  <Icon name="check" size={14} color="#16A34A" />
                </View>
                <Text style={styles.missionText}>Provide reliable support and innovation</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => router.push('/(auth)/signup' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>Get Started with BharatPOS →</Text>
            </TouchableOpacity>
          </View>

          {/* Right Column: Terminal Hardware & Trust Badge */}
          <View style={[styles.rightCol, { width: isDesktop ? '40%' : '100%' }]}>
            <Surface style={styles.hardwareCard} elevation={2}>
              <View style={styles.mockTerminalBox}>
                <View style={styles.mockScreenTop}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                    <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  </View>
                  <Text style={styles.mockTerminalHeader}>Store Terminal · Retail</Text>
                </View>
                <View style={styles.mockScreenBody}>
                  <Icon name="cash-register" size={40} color="#16A34A" />
                  <Text style={styles.mockTitle}>BharatPOS Cloud Terminal</Text>
                  <Text style={styles.mockSub}>Dual Display · Barcode · GST Ready</Text>
                </View>
              </View>
              <View style={styles.terminalStand} />
              <View style={styles.terminalBase} />

              <View style={styles.trustedBadge}>
                <Icon name="star" size={20} color="#F59E0B" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.trustedBold}>5,000+</Text>
                  <Text style={styles.trustedSub}>Happy Businesses Across India</Text>
                </View>
              </View>
            </Surface>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  getStartedBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  getStartedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollWrap: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    maxWidth: 1140,
    width: '100%',
    alignSelf: 'center',
  },
  mainSection: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 40,
  },
  leftCol: {
    paddingRight: 12,
  },
  aboutMainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  aboutSubTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 24,
  },
  aboutStoryText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 28,
    marginBottom: 32,
  },
  aboutMissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  missionList: {
    gap: 14,
    marginBottom: 36,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  rightCol: {
    alignItems: 'center',
  },
  hardwareCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  mockTerminalBox: {
    width: 280,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  mockScreenTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockTerminalHeader: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  mockScreenBody: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  mockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  mockSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  terminalStand: {
    width: 24,
    height: 20,
    backgroundColor: '#CBD5E1',
  },
  terminalBase: {
    width: 120,
    height: 10,
    backgroundColor: '#94A3B8',
    borderRadius: 5,
    marginBottom: 20,
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  trustedBold: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  trustedSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
