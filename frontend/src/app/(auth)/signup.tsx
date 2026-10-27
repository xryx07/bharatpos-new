import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Text, useTheme, Button, Surface, TextInput } from 'react-native-paper';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from '../../lib/firestore_adapter';
import { useAppTheme } from '../../providers/ThemeProvider';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function SignupScreen() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = isMounted && Platform.OS === 'web' && screenWidth > 768;

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields matching Image 3
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail Shop');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Grocery');
  const [gstNumber, setGstNumber] = useState('');
  const [chosenPos, setChosenPos] = useState<'shop' | 'cafe'>('shop');

  // Step 2 Fields (Personal info / Password)
  const [ownerName, setOwnerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleNextStep = () => {
    setErrorMsg('');
    if (!businessName.trim() || !mobileNumber.trim() || !email.trim()) {
      setErrorMsg('Please fill in your Business Name, Mobile Number, and Email.');
      return;
    }
    setCurrentStep(2);
  };

  const handleSignUpSubmit = async () => {
    setErrorMsg('');
    if (!password || !confirmPassword) {
      setErrorMsg('Please enter and confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        role: 'owner',
        subscription_plan: 'free_trial',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        storeName: businessName.trim(),
        businessType,
        businessCategory,
        gstNumber: gstNumber.trim() || null,
        isGSTRegistered: !!gstNumber.trim(),
        chosenPos,
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        ownerName: ownerName.trim() || 'Store Owner',
        permissions: {
          pos_access: true,
          stock_management: true,
          barcode_generation: true,
          reporting: true
        }
      });

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('storeName', businessName.trim());
        window.localStorage.setItem('posBusinessMode', chosenPos === 'cafe' ? 'restaurant' : 'retail');
        window.localStorage.setItem('isGstRegistered', String(!!gstNumber.trim()));
      }

      setCurrentStep(3);
    } catch (error: any) {
      let message = error.message;
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollWrap} showsVerticalScrollIndicator={false}>
        
        {/* Top Header Logo */}
        <TouchableOpacity onPress={() => router.push('/')} style={styles.brandRow} activeOpacity={0.85}>
          <View style={styles.brandIconCircle}>
            <Icon name="cash-register" size={24} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.brandTitle}>BharatPOS</Text>
            <Text style={styles.brandSubtitle}>Simple. Smart. For Every Business.</Text>
          </View>
        </TouchableOpacity>

        {/* Main Card */}
        <Surface style={styles.cardContainer} elevation={1}>
          
          <Text style={styles.mainTitle}>Create Your Account</Text>
          <Text style={styles.subTitle}>Start your free trial and manage your business better.</Text>

          {/* Stepper Progress Indicator (Image 3) */}
          <View style={styles.stepperRow}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= 1 ? styles.stepCircleActive : styles.stepCircleInactive]}>
                <Text style={[styles.stepNum, currentStep >= 1 ? styles.stepNumActive : styles.stepNumInactive]}>1</Text>
              </View>
              <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Business Details</Text>
            </View>
            <View style={[styles.stepConnector, currentStep >= 2 && styles.stepConnectorActive]} />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= 2 ? styles.stepCircleActive : styles.stepCircleInactive]}>
                <Text style={[styles.stepNum, currentStep >= 2 ? styles.stepNumActive : styles.stepNumInactive]}>2</Text>
              </View>
              <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Personal Info</Text>
            </View>
            <View style={[styles.stepConnector, currentStep >= 3 && styles.stepConnectorActive]} />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep === 3 ? styles.stepCircleActive : styles.stepCircleInactive]}>
                <Text style={[styles.stepNum, currentStep === 3 ? styles.stepNumActive : styles.stepNumInactive]}>3</Text>
              </View>
              <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>Complete</Text>
            </View>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* STEP 1: BUSINESS DETAILS */}
          {currentStep === 1 && (
            <View style={styles.stepBody}>
              <Text style={styles.sectionHeaderTitle}>BUSINESS DETAILS</Text>

              {/* Row 1: Business Name + Business Type */}
              <View style={[styles.formGridRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Business Name</Text>
                  <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Enter business name"
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Business Type</Text>
                  <TextInput
                    value={businessType}
                    onChangeText={setBusinessType}
                    placeholder="e.g. Retail Shop, Cafe, Wholesale..."
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
              </View>

              {/* Row 2: Mobile Number + Email Address */}
              <View style={[styles.formGridRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBox}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      placeholder="Enter mobile number"
                      keyboardType="phone-pad"
                      style={[styles.input, { flex: 1 }]}
                      mode="outlined"
                      outlineColor="#E2E8F0"
                      activeOutlineColor="#16A34A"
                      dense
                    />
                  </View>
                </View>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
              </View>

              {/* Row 3: Business Category + GST Number */}
              <View style={[styles.formGridRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Business Category</Text>
                  <TextInput
                    value={businessCategory}
                    onChangeText={setBusinessCategory}
                    placeholder="Select category (e.g. Grocery, Cafe)"
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>GST Number (Optional)</Text>
                  <TextInput
                    value={gstNumber}
                    onChangeText={setGstNumber}
                    placeholder="Enter GST number"
                    autoCapitalize="characters"
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
              </View>

              {/* Choose Your POS (Image 3) */}
              <Text style={styles.inputLabelTitle}>Choose Your POS</Text>
              <View style={[styles.posChoicesRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                {/* Shop POS Card */}
                <TouchableOpacity
                  style={[styles.posChoiceCard, chosenPos === 'shop' && styles.posChoiceCardActive]}
                  onPress={() => setChosenPos('shop')}
                  activeOpacity={0.85}
                >
                  <View style={styles.posChoiceLeft}>
                    <View style={[styles.posChoiceIconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Icon name="cart-outline" size={20} color="#16A34A" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.posChoiceName}>Shop POS</Text>
                      <Text style={styles.posChoiceSub}>Retail & Wholesale</Text>
                    </View>
                  </View>
                  {chosenPos === 'shop' && (
                    <View style={styles.checkPill}>
                      <Icon name="check" size={16} color="#16A34A" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Cafe & Restaurant POS Card */}
                <TouchableOpacity
                  style={[styles.posChoiceCard, chosenPos === 'cafe' && styles.posChoiceCardActiveOrange]}
                  onPress={() => setChosenPos('cafe')}
                  activeOpacity={0.85}
                >
                  <View style={styles.posChoiceLeft}>
                    <View style={[styles.posChoiceIconCircle, { backgroundColor: '#FFEDD5' }]}>
                      <Icon name="silverware-fork-knife" size={20} color="#EA580C" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.posChoiceName}>Cafe & Restaurant POS</Text>
                      <Text style={styles.posChoiceSub}>Dine-In | Takeaway | Delivery</Text>
                    </View>
                  </View>
                  {chosenPos === 'cafe' && (
                    <View style={styles.checkPillOrange}>
                      <Icon name="check" size={16} color="#EA580C" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Bottom Actions Row */}
              <View style={styles.footerActionsRow}>
                <View style={styles.alreadyHaveWrap}>
                  <Text style={styles.alreadyText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                    <Text style={styles.loginLink}>Log In</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.nextBtnGreen}
                  onPress={handleNextStep}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nextBtnText}>Next  →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: PERSONAL INFO */}
          {currentStep === 2 && (
            <View style={styles.stepBody}>
              <Text style={styles.sectionHeaderTitle}>PERSONAL INFO</Text>

              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>Owner / Manager Full Name</Text>
                <TextInput
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter full name"
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#16A34A"
                  dense
                />
              </View>

              <View style={[styles.formGridRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Create Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Create a strong password"
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
                <View style={styles.fieldBox}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Confirm password"
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#E2E8F0"
                    activeOutlineColor="#16A34A"
                    dense
                  />
                </View>
              </View>

              {/* Bottom Actions Row */}
              <View style={styles.footerActionsRow}>
                <TouchableOpacity
                  style={styles.backBtnOutline}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextBtnGreen}
                  onPress={handleSignUpSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nextBtnText}>{loading ? 'Creating Account...' : 'Complete Setup  ✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: COMPLETE */}
          {currentStep === 3 && (
            <View style={styles.successWrapper}>
              <View style={styles.successIconCircle}>
                <Icon name="check-bold" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Account Created Successfully!</Text>
              <Text style={styles.successSub}>
                Welcome to BharatPOS! Your 14-day free trial has been activated with full feature access.
              </Text>

              <TouchableOpacity
                style={styles.enterDashboardBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.localStorage.setItem('ownerBypass', 'true');
                  }
                  if (chosenPos === 'cafe') {
                    router.replace('/(owner)/tables_kot' as any);
                  } else {
                    router.replace('/(owner)' as any);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.enterDashboardText}>Enter Dashboard  →</Text>
              </TouchableOpacity>
            </View>
          )}

        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#16A34A',
  },
  stepCircleInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepNumInactive: {
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepLabelActive: {
    color: '#0F172A',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  stepConnectorActive: {
    backgroundColor: '#16A34A',
  },
  stepBody: {
    width: '100%',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 16,
  },
  formGridRow: {
    gap: 16,
    marginBottom: 14,
  },
  fieldBox: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  inputLabelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 12,
  },
  posChoicesRow: {
    gap: 14,
    marginBottom: 28,
  },
  posChoiceCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  posChoiceCardActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  posChoiceCardActiveOrange: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  posChoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posChoiceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posChoiceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  posChoiceSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkPillOrange: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  alreadyHaveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyText: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  nextBtnGreen: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  backBtnOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 22,
    marginBottom: 28,
  },
  enterDashboardBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  enterDashboardText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
