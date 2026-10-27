import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function FAQScreen() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  const faqs = [
    { q: "How does the barcode scanner work with the software?", a: "Our POS is plug-and-play with any standard USB or Bluetooth barcode scanner. Simply plug it into your laptop or tablet, click the scanning input, and items are scanned and added to the cart instantly. On mobile, you can use the built-in device camera as a high-speed scanner." },
    { q: "Can cashiers/waiters use the mobile app while I use the laptop?", a: "Yes, absolutely! Our system supports real-time multi-device concurrent sync. Your workers can check out customers on their mobile phones while you oversee analytics and ledgers live on your laptop." },
    { q: "Can I run this on my laptop as well?", a: "Yes, our POS is fully web-responsive and optimized for desktops, laptops, tablets, and mobile viewports. You can open it in any web browser." },
    { q: "Is GST calculation included in bills?", a: "Yes, the POS auto-computes SGST, CGST, and IGST according to your custom default rates. Tax is itemized on prints, and you can export audit CSVs for easy GSTR filing." },
    { q: "Can I download PDF reports?", a: "Yes. Day Books, Ledgers, GST Returns summaries, P&L reports, and invoice logs can all be exported as formatted PDF tables or downloaded in CSV spreadsheet formats." },
    { q: "What happens after my subscription expires?", a: "Your billing terminal locks temporarily but your data is preserved safely on our Firestore servers. You can renew your subscription plan at any time to resume terminal access." },
    { q: "Can I upgrade or renew my plan anytime?", a: "Yes. You can upgrade, renew, or add devices to your active plan from the 'Upgrade' screen in your Owner Settings menu instantly." }
  ];

  const toggleFaq = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

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
        <Text style={styles.heading}>Frequently Asked Questions</Text>
        <Text style={styles.subtitle}>Find answers to common questions about BharatPOS.</Text>

        {/* Accordions */}
        <View style={styles.faqList}>
          {faqs.map((faq, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.faqCard, expandedIdx === idx && styles.faqCardExpanded]} 
              onPress={() => toggleFaq(idx)} 
              activeOpacity={0.85}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, expandedIdx === idx && { color: '#16A34A' }]}>{faq.q}</Text>
                <Icon name={expandedIdx === idx ? "chevron-up" : "chevron-down"} size={20} color={expandedIdx === idx ? "#16A34A" : "#64748B"} />
              </View>
              {expandedIdx === idx && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
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
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
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
    marginBottom: 36,
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqCardExpanded: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    paddingRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
