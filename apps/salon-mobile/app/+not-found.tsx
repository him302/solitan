import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../src/providers/ThemeProvider';

/** Fallback route for unmatched paths. */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.s5,
        backgroundColor: theme.colors.bg,
      }}
    >
      <Text style={{ color: theme.colors.ink }}>{t('errors.notFound')}</Text>
      <Link href="/" style={{ marginTop: theme.spacing.s4, color: theme.colors.accent }}>
        {t('common.retry')}
      </Link>
    </View>
  );
}
