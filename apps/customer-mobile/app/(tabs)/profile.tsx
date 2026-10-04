import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Divider, Avatar } from '@soliton/ui';
import { changeLanguage, type SupportedLocale } from '@soliton/i18n';
import { useAppStore } from '../../src/stores/appStore';
import { i18n } from '../../src/i18n';

function SectionHeader({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: theme.type.caption.size,
        fontWeight: theme.type.label.weight,
        color: theme.colors.inkSoft,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: theme.spacing.s2,
        marginTop: theme.spacing.s4,
        paddingHorizontal: theme.spacing.s1,
      }}
    >
      {label}
    </Text>
  );
}

function RowItem({
  label,
  value,
  selected,
  onPress,
  chevron = false,
}: {
  label: string;
  value?: string;
  selected?: boolean;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={selected !== undefined ? 'radio' : 'button'}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s3,
        minHeight: theme.minTouchTarget,
      }}
    >
      <Text style={{ fontSize: theme.type.body.size, color: theme.colors.ink, flex: 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
        {value ? (
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>{value}</Text>
        ) : null}
        {selected ? (
          <Text style={{ color: theme.colors.accent, fontSize: theme.type.body.size }}>✓</Text>
        ) : null}
        {chevron ? (
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size }}>›</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Customer profile screen: account, preferences, support, legal. */
export default function ProfileScreen() {
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
          {t('profile.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s5,
        }}
      >
        {/* Account */}
        <Card style={{ marginTop: theme.spacing.s1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, paddingVertical: theme.spacing.s2 }}>
            <Avatar label="GU" size={48} />
            <View>
              <Text style={{ fontSize: theme.type.label.size, fontWeight: theme.type.label.weight, color: theme.colors.ink }}>
                {t('profile.guestUser')}
              </Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size, marginTop: 2 }}>
                {t('profile.signIn')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Preferences */}
        <SectionHeader label={t('profile.preferences')} />
        <Card>
          <Text
            style={{
              fontSize: theme.type.label.size,
              fontWeight: theme.type.label.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s2,
            }}
          >
            {t('settings.languageLabel')}
          </Text>
          <RowItem
            label={t('settings.english')}
            selected={locale === 'en'}
            onPress={() => switchLanguage('en')}
          />
          <Divider />
          <RowItem
            label={t('settings.hindi')}
            selected={locale === 'hi'}
            onPress={() => switchLanguage('hi')}
          />

          <Divider />
          <View style={{ marginTop: theme.spacing.s3, marginBottom: theme.spacing.s2 }}>
            <Text
              style={{
                fontSize: theme.type.label.size,
                fontWeight: theme.type.label.weight,
                color: theme.colors.ink,
                marginBottom: theme.spacing.s2,
              }}
            >
              {t('settings.appearance')}
            </Text>
            <RowItem
              label={t('settings.lightMode')}
              selected={scheme === 'light'}
              onPress={() => setScheme('light')}
            />
            <Divider />
            <RowItem
              label={t('settings.darkMode')}
              selected={scheme === 'dark'}
              onPress={() => setScheme('dark')}
            />
          </View>
        </Card>

        {/* Support */}
        <SectionHeader label={t('profile.support')} />
        <Card>
          <RowItem label={t('profile.helpCenter')} chevron />
          <Divider />
          <RowItem label={t('profile.contactSupport')} chevron />
        </Card>

        {/* Legal */}
        <SectionHeader label={t('profile.legal')} />
        <Card>
          <RowItem label={t('profile.terms')} chevron />
          <Divider />
          <RowItem label={t('profile.privacy')} chevron />
        </Card>

        {/* About */}
        <SectionHeader label={t('settings.about')} />
        <Card>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size, lineHeight: 22 }}>
            {t('settings.appDescription')}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
