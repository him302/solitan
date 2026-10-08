import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@soliton/ui';
import { Divider, Card } from '@soliton/ui';
import { changeLanguage, type SupportedLocale } from '@soliton/i18n';
import { useAppStore, type AppColorScheme } from '../../src/stores/appStore';
import { i18n } from '../../src/i18n';

/** Customer settings screen: language and appearance. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const scheme = useAppStore((s) => s.colorScheme);
  const setScheme = useAppStore((s) => s.setColorScheme);

  const switchLanguage = async (next: SupportedLocale) => {
    setLocale(next);
    await changeLanguage(i18n, next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4 }}>
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s5,
          gap: theme.spacing.s4,
        }}
      >
        {/* Language */}
        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s3,
            }}
          >
            {t('settings.languageLabel')}
          </Text>
          <OptionRow
            label={t('settings.english')}
            selected={locale === 'en'}
            onPress={() => switchLanguage('en')}
          />
          <Divider />
          <OptionRow
            label={t('settings.hindi')}
            selected={locale === 'hi'}
            onPress={() => switchLanguage('hi')}
          />
        </Card>

        {/* Appearance */}
        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s3,
            }}
          >
            {t('settings.appearance')}
          </Text>
          <OptionRow
            label={t('settings.systemMode')}
            selected={scheme === 'system'}
            onPress={() => setScheme('system' as AppColorScheme)}
          />
          <Divider />
          <OptionRow
            label={t('settings.lightMode')}
            selected={scheme === 'light'}
            onPress={() => setScheme('light')}
          />
          <Divider />
          <OptionRow
            label={t('settings.darkMode')}
            selected={scheme === 'dark'}
            onPress={() => setScheme('dark')}
          />
        </Card>

        {/* About */}
        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s2,
            }}
          >
            {t('settings.about')}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>
            {t('settings.appDescription')}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s3,
        minHeight: theme.minTouchTarget,
      }}
    >
      <Text style={{ fontSize: theme.type.body.size, color: theme.colors.ink }}>{label}</Text>
      {selected && (
        <Text style={{ color: theme.colors.accent, fontSize: theme.type.body.size }}>✓</Text>
      )}
    </Pressable>
  );
}
