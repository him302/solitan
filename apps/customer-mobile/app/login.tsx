import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAROON = '#A50000';

type Mode = 'landing' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const goToMain = () => router.replace('/(tabs)');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo mark */}
        <View style={styles.logoMark}>
          <Text style={styles.logoSymbol}>✦</Text>
        </View>

        <Text style={styles.welcome}>Welcome to Solitan</Text>
        <Text style={styles.sub}>Your next salon visit starts here.</Text>

        {mode === 'landing' ? (
          <View style={styles.optionsContainer}>
            {/* Google */}
            <Pressable style={styles.outlinedBtn} onPress={goToMain}>
              <Text style={styles.optionIcon}>G</Text>
              <Text style={styles.outlinedBtnText}>Continue with Google</Text>
            </Pressable>

            {/* Phone */}
            <Pressable style={styles.outlinedBtn} onPress={goToMain}>
              <Text style={styles.optionIcon}>📱</Text>
              <Text style={styles.outlinedBtnText}>Continue with Phone</Text>
            </Pressable>

            {/* Email */}
            <Pressable
              style={styles.outlinedBtn}
              onPress={() => setMode('email')}
            >
              <Text style={styles.optionIcon}>✉️</Text>
              <Text style={styles.outlinedBtnText}>Continue with Email</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest */}
            <Pressable onPress={goToMain}>
              <Text style={styles.guestText}>Continue as Guest</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#B0ADA8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.formLabel, { marginTop: 16 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#B0ADA8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable style={styles.primaryBtn} onPress={goToMain}>
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </Pressable>

            <Pressable onPress={goToMain} style={{ marginTop: 16, alignSelf: 'center' }}>
              <Text style={styles.guestText}>Continue as Guest</Text>
            </Pressable>

            <Pressable onPress={() => setMode('landing')} style={{ marginTop: 20, alignSelf: 'center' }}>
              <Text style={{ color: '#8A8780', fontSize: 14 }}>← Back</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={{ color: MAROON }}>Terms</Text> and{' '}
          <Text style={{ color: MAROON }}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoSymbol: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  welcome: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1E1C',
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    color: '#605E57',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  outlinedBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0D8CE',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  optionIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: '#4285F4',
  },
  outlinedBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E1C',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9E3D6',
  },
  dividerText: {
    color: '#8A8780',
    fontSize: 14,
  },
  guestText: {
    color: MAROON,
    fontSize: 15,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1E1C',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0D8CE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E1E1C',
    backgroundColor: '#FAFAFA',
  },
  primaryBtn: {
    backgroundColor: MAROON,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  legal: {
    fontSize: 13,
    color: '#8A8780',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 18,
  },
});
