import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function PricingScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

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
        {/* Header */}
        <Text style={styles.heading}>Simple, Transparent Pricing</Text>
        <Text style={styles.subtitle}>Choose the plan that fits your business needs. No hidden charges.</Text>

        {/* Toggle Monthly / Yearly */}
        <View style={styles.toggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]} 
            onPress={() => setBillingCycle('monthly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, billingCycle === 'yearly' && styles.toggleBtnActive]} 
            onPress={() => setBillingCycle('yearly')}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>Yearly (Save 20%)</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Cards Grid (Image 12) */}
        <View style={[styles.cardsGrid, { flexDirection: screenWidth > 960 ? 'row' : 'column' }]}>
          
          {/* Card 1: Free Trial */}
          <Card style={styles.planCard} elevation={0}>
            <Card.Content style={styles.cardInner}>
              <Text style={styles.planName}>Free Trial</Text>
              <Text style={styles.priceNumber}>₹0</Text>
              <Text style={styles.planDuration}>14 Days Free Trial</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Basic POS Features</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Up to 100 Products/mo</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Email Support</Text></View>

              <TouchableOpacity 
                style={styles.outlineBtn}
                onPress={() => router.push('/(auth)/signup' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.outlineBtnText}>Start Free Trial</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* Card 2: Basic Plan */}
          <Card style={styles.planCard} elevation={0}>
            <Card.Content style={styles.cardInner}>
              <Text style={styles.planName}>Basic Plan</Text>
              <Text style={styles.priceNumber}>{billingCycle === 'yearly' ? '₹4,999' : '₹499'}<Text style={styles.perYear}>/Year</Text></Text>
              <Text style={styles.planDuration}>1 Year Subscription</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>All Basic Features</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Unlimited Products</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>PDF Reports</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Priority Support</Text></View>

              <TouchableOpacity 
                style={styles.solidBtn}
                onPress={() => router.push('/(auth)/signup' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.solidBtnText}>Buy Now</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* Card 3: Professional Plan (POPULAR) */}
          <Card style={[styles.planCard, styles.popularCard]} elevation={1}>
            <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>POPULAR</Text></View>
            <Card.Content style={styles.cardInner}>
              <Text style={[styles.planName, { color: '#0F172A' }]}>Professional Plan</Text>
              <Text style={styles.priceNumber}>{billingCycle === 'yearly' ? '₹8,999' : '₹899'}<Text style={styles.perYear}>/Year</Text></Text>
              <Text style={styles.planDuration}>1 Year Subscription</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>All Basic + Premium Features</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Advanced Reports</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Multi-outlet Support</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Automated Cloud Backup</Text></View>

              <TouchableOpacity 
                style={[styles.solidBtn, { backgroundColor: '#16A34A' }]}
                onPress={() => router.push('/(auth)/signup' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.solidBtnText}>Buy Now</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* Card 4: Enterprise Plan */}
          <Card style={styles.planCard} elevation={0}>
            <Card.Content style={styles.cardInner}>
              <Text style={styles.planName}>Enterprise Plan</Text>
              <Text style={styles.priceNumber}>{billingCycle === 'yearly' ? '₹12,999' : '₹1,299'}<Text style={styles.perYear}>/Year</Text></Text>
              <Text style={styles.planDuration}>Custom Multi-Terminal</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>All Premium Features</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Dedicated Support</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Custom Permissions</Text></View>
              <View style={styles.featureItem}><Icon name="check" color="#16A34A" size={16} /><Text style={styles.featureText}>Advanced Analytics Engine</Text></View>

              <TouchableOpacity 
                style={styles.solidBtn}
                onPress={() => router.push('/(auth)/signup' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.solidBtnText}>Buy Now</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>

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
    paddingVertical: 48,
    paddingHorizontal: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 40,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#0F172A',
  },
  cardsGrid: {
    width: '100%',
    gap: 20,
    justifyContent: 'center',
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    position: 'relative',
  },
  popularCard: {
    borderColor: '#16A34A',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardInner: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  priceNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  perYear: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  planDuration: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    marginVertical: 16,
    backgroundColor: '#F1F5F9',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  outlineBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    alignItems: 'center',
    marginTop: 20,
  },
  outlineBtnText: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '700',
  },
  solidBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    marginTop: 20,
  },
  solidBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
