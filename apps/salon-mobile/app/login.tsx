import { useState } from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, Button, Card } from '@soliton/ui';
import { api } from '../src/api';
import { useAuthStore } from '../src/auth/authStore';

/** Salon owner/staff login screen. */
export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const tokens = await api.auth.login(email, password);
      const user = await api.auth.me();
      await setSession(tokens, user);
      router.replace('/(manage)');
    } catch {
      setError(t('salon.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        justifyContent: 'center',
        padding: theme.spacing.s5,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Card style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}>
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
            textAlign: 'center',
            marginBottom: theme.spacing.s5,
          }}
        >
          {t('salon.login.title')}
        </Text>

        <TextInput
          placeholder={t('salon.login.emailPlaceholder')}
          placeholderTextColor={theme.colors.inkSoft}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('salon.login.emailPlaceholder')}
          style={{
            backgroundColor: theme.colors.bg,
            borderRadius: theme.radius.input,
            paddingHorizontal: theme.spacing.s4,
            paddingVertical: theme.spacing.s3,
            fontSize: theme.type.body.size,
            color: theme.colors.ink,
            borderWidth: theme.borderWidth.hairline,
            borderColor: theme.colors.line,
            marginBottom: theme.spacing.s3,
          }}
        />

        <TextInput
          placeholder={t('salon.login.passwordPlaceholder')}
          placeholderTextColor={theme.colors.inkSoft}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel={t('salon.login.passwordPlaceholder')}
          style={{
            backgroundColor: theme.colors.bg,
            borderRadius: theme.radius.input,
            paddingHorizontal: theme.spacing.s4,
            paddingVertical: theme.spacing.s3,
            fontSize: theme.type.body.size,
            color: theme.colors.ink,
            borderWidth: theme.borderWidth.hairline,
            borderColor: theme.colors.line,
            marginBottom: theme.spacing.s4,
          }}
        />

        {error ? (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.type.caption.size,
              marginBottom: theme.spacing.s3,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.s3 }}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={{ color: theme.colors.inkSoft, marginTop: theme.spacing.s2 }}>
              {t('salon.login.signingIn')}
            </Text>
          </View>
        ) : (
          <Button label={t('salon.login.signIn')} onPress={handleLogin} />
        )}
      </Card>
    </View>
  );
}
