import { useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Button, LoadingState, ErrorState } from '@soliton/ui';
import { useMySalon, useUpdateSalon } from '../../src/hooks/useMySalon';

/** Salon profile editing screen. */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon, isLoading, isError, refetch } = useMySalon();
  const updateMutation = useUpdateSalon();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Populate form when salon loads.
  useEffect(() => {
    if (salon) {
      setName(salon.name);
      setAddress(salon.address ?? '');
      setCity(salon.city ?? '');
      setLatitude(salon.location.latitude.toString());
      setLongitude(salon.location.longitude.toString());
    }
  }, [salon]);

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (isError || !salon) {
    return (
      <ErrorState
        title={t('errors.loadFailed')}
        onRetry={() => refetch()}
        retryLabel={t('common.retry')}
      />
    );
  }

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('salon.profile.nameLabel'));
      return;
    }
    if (!city.trim()) {
      Alert.alert(t('common.required'), t('salon.profile.cityLabel'));
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert(t('common.required'), t('salon.profile.latitudeLabel'));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        salonId: salon.id,
        input: {
          name: name.trim(),
          address: address.trim() || undefined,
          city: city.trim(),
          latitude: lat,
          longitude: lng,
        },
      });
      Alert.alert('', t('salon.profile.saveSuccess'));
    } catch {
      Alert.alert('', t('salon.profile.saveError'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          {t('salon.profile.title')}
        </Text>

        <Card style={{ gap: theme.spacing.s3 }}>
          <FormField
            label={t('salon.profile.nameLabel')}
            value={name}
            onChangeText={setName}
            placeholder={t('salon.profile.namePlaceholder')}
          />
          <FormField
            label={t('salon.profile.addressLabel')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('salon.profile.addressPlaceholder')}
          />
          <FormField
            label={t('salon.profile.cityLabel')}
            value={city}
            onChangeText={setCity}
            placeholder={t('salon.profile.cityPlaceholder')}
          />
          <FormField
            label={t('salon.profile.latitudeLabel')}
            value={latitude}
            onChangeText={setLatitude}
            keyboardType="numeric"
          />
          <FormField
            label={t('salon.profile.longitudeLabel')}
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="numeric"
          />
        </Card>

        <Button
          label={updateMutation.isPending ? t('common.loading') : t('common.save')}
          onPress={handleSave}
        />
      </ScrollView>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: theme.type.caption.size,
          fontWeight: theme.type.label.weight,
          color: theme.colors.inkSoft,
          marginBottom: theme.spacing.s1,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkSoft}
        keyboardType={keyboardType ?? 'default'}
        accessibilityLabel={label}
        style={{
          backgroundColor: theme.colors.bg,
          borderRadius: theme.radius.input,
          paddingHorizontal: theme.spacing.s4,
          paddingVertical: theme.spacing.s3,
          fontSize: theme.type.body.size,
          color: theme.colors.ink,
          borderWidth: theme.borderWidth.hairline,
          borderColor: theme.colors.line,
        }}
      />
    </View>
  );
}
