import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, TextInput } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ContactScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth > 860;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name || !email || !message) {
      alert('Please fill out all fields.');
      return;
    }
    setSubmitted(true);
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
        <Text style={styles.heading}>Get in Touch With Us</Text>
        <Text style={styles.subtitle}>We're here to help! Reach out to our team for any query, support or feedback.</Text>

        <View style={[styles.contentRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          
          {/* Left Column: Direct Contacts */}
          <View style={[styles.leftCol, { width: isDesktop ? '45%' : '100%' }]}>
            
            {/* WhatsApp */}
            <View style={styles.contactCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Icon name="whatsapp" size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>WhatsApp Support</Text>
                <Text style={styles.contactValue}>+91 98765 43210</Text>
                <Text style={styles.contactSub}>Mon-Sat, 9AM-8PM</Text>
              </View>
            </View>

            {/* Phone */}
            <View style={styles.contactCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="phone" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>Phone Helpline</Text>
                <Text style={styles.contactValue}>1800 200 9876</Text>
                <Text style={styles.contactSub}>Toll-Free Customer Care</Text>
              </View>
            </View>

            {/* Email */}
            <View style={styles.contactCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Icon name="email-outline" size={22} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>Technical Support</Text>
                <Text style={styles.contactValue}>support@bharatpos.in</Text>
                <Text style={styles.contactSub}>Replies within 2 hours</Text>
              </View>
            </View>

          </View>

          {/* Right Column: Contact Form */}
          <View style={[styles.rightCol, { width: isDesktop ? '50%' : '100%' }]}>
            <Surface style={styles.formCard} elevation={1}>
              {submitted ? (
                <View style={styles.successBox}>
                  <Icon name="check-circle" size={48} color="#16A34A" />
                  <Text style={styles.successTitle}>Message Sent!</Text>
                  <Text style={styles.successText}>Thank you for contacting BharatPOS. Our team will get back to you shortly.</Text>
                  <TouchableOpacity style={styles.resetBtn} onPress={() => setSubmitted(false)}>
                    <Text style={styles.resetBtnText}>Send Another Message</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.formTitle}>Send a Message</Text>
                  
                  <Text style={styles.fieldLabel}>Your Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.fieldLabel}>Message / Query</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Type your message here..."
                    multiline
                    numberOfLines={4}
                    value={message}
                    onChangeText={setMessage}
                  />

                  <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                    <Text style={styles.submitBtnText}>Send Message</Text>
                  </TouchableOpacity>
                </>
              )}
            </Surface>
          </View>

        </View>
      </ScrollView>

      {/* Dark Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Text style={styles.footerBrand}>BharatPOS · Simple. Smart. For Every Business.</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/')}><Text style={styles.footerLinkText}>Home</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/pricing' as any)}><Text style={styles.footerLinkText}>Pricing</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/about' as any)}><Text style={styles.footerLinkText}>About</Text></TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxWidth: 1100,
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
    marginBottom: 40,
  },
  contentRow: {
    justifyContent: 'space-between',
    gap: 32,
  },
  leftCol: {
    gap: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  contactSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  rightCol: {},
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  successText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resetBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#0B132B',
    paddingVertical: 20,
    paddingHorizontal: 28,
    marginTop: 'auto',
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerBrand: {
    color: '#94A3B8',
    fontSize: 13,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 20,
  },
  footerLinkText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
});
