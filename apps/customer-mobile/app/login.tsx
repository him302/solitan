import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { api } from '../src/api';
import { useAuthStore } from '../src/auth/authStore';

const MAROON = '#A50000';

function routeByRole(role: string | undefined, router: ReturnType<typeof useRouter>) {
  if (role === 'owner' || role === 'staff') {
    router.replace('/(manage)');
  } else {
    router.replace('/(tabs)');
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const goToCustomer = () => router.replace('/(tabs)');

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Sign in', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const tokens = await api.auth.login(email.trim(), password);
      const user = await api.auth.me();
      await setSession(tokens, user);
      routeByRole(user.role, router);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Check your credentials.';
      Alert.alert('Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoMark}>
          <Text style={styles.logoSymbol}>✦</Text>
        </View>
        <Text style={styles.welcome}>Welcome to Solitan</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#B0ADA8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#B0ADA8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={() => void handleSignIn()}
            returnKeyType="go"
          />

          <Pressable
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={() => void handleSignIn()}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Guest */}
        <Pressable onPress={goToCustomer} accessibilityRole="button" style={styles.guestBtn}>
          <Text style={styles.guestText}>Continue as Guest</Text>
          <Text style={styles.guestSub}>Browse salons without an account</Text>
        </Pressable>

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
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoSymbol: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  welcome: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E1E1C',
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    color: '#605E57',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
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
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: MAROON,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 52,
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginVertical: 24,
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
  guestBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E0D8CE',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  guestText: {
    color: MAROON,
    fontSize: 16,
    fontWeight: '700',
  },
  guestSub: {
    color: '#8A8780',
    fontSize: 12,
  },
  legal: {
    fontSize: 13,
    color: '#8A8780',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
