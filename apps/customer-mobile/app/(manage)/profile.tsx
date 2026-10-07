import { useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Card, Button, LoadingState, ErrorState } from '@soliton/ui';
import { useMySalon, useUpdateSalon } from '../../src/hooks/useMySalon';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon, isLoading, isError, refetch } = useMySalon();
  const updateMutation = useUpdateSalon();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    if (salon) {
      setName(salon.name);
      setAddress(salon.address ?? '');
      setCity(salon.city ?? '');
      setLatitude(salon.location.latitude.toString());
      setLongitude(salon.location.longitude.toString());
    }
  }, [salon]);

  if (isLoading) return <LoadingState label="Loading…" />;
  if (isError || !salon) {
    return (
      <ErrorState
        title="Could not load salon"
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!name.trim()) { Alert.alert('Required', 'Salon name is required.'); return; }
    if (!city.trim()) { Alert.alert('Required', 'City is required.'); return; }
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert('Invalid', 'Enter valid latitude and longitude.');
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
      Alert.alert('', 'Profile saved.');
    } catch {
      Alert.alert('', 'Could not save profile. Please try again.');
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
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          Edit Profile
        </Text>

        <Card style={{ gap: theme.spacing.s3 }}>
          <FormField label="Salon Name"  value={name}      onChangeText={setName}      placeholder="e.g. Classic Cuts" />
          <FormField label="Address"     value={address}   onChangeText={setAddress}   placeholder="Street address" />
          <FormField label="City"        value={city}      onChangeText={setCity}       placeholder="City" />
          <FormField label="Latitude"    value={latitude}  onChangeText={setLatitude}  keyboardType="numeric" />
          <FormField label="Longitude"   value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
        </Card>

        <Button
          label={updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          onPress={() => void handleSave()}
        />
      </ScrollView>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'decimal-pad';
}) {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ fontSize: theme.type.caption.size, fontWeight: theme.type.label.weight, color: theme.colors.inkSoft, marginBottom: theme.spacing.s1 }}>
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
