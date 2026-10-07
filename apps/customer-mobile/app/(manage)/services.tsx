import { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Card, Button, LoadingState, ErrorState, EmptyState } from '@soliton/ui';
import type { ServiceDto } from '@soliton/api-contract';
import { useMySalon } from '../../src/hooks/useMySalon';
import {
  useSalonServices,
  useCreateService,
  useUpdateService,
  useDeactivateService,
} from '../../src/hooks/useServices';
import { formatPrice, formatDuration } from '../../src/utils/format';

export default function ServicesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const { data: services, isLoading, isError, refetch } = useSalonServices(salonId);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);

  const openCreate = () => { setEditingService(null); setModalVisible(true); };
  const openEdit = (svc: ServiceDto) => { setEditingService(svc); setModalVisible(true); };

  if (isLoading) return <LoadingState label="Loading…" />;
  if (isError) {
    return <ErrorState title="Could not load services" onRetry={() => refetch()} retryLabel="Retry" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4 }}>
        <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
          Services
        </Text>
        <Button label="+ Add Service" onPress={openCreate} />
      </View>

      {!services || services.length === 0 ? (
        <EmptyState title="No services yet" body="Add your first service to get started." />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s5 }}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.s2 }} />}
          renderItem={({ item }) => (
            <ServiceCard service={item} onEdit={() => openEdit(item)} salonId={salonId!} />
          )}
        />
      )}

      {salonId && (
        <ServiceFormModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          salonId={salonId}
          editing={editingService}
        />
      )}
    </View>
  );
}

function ServiceCard({ service, onEdit, salonId }: { service: ServiceDto; onEdit: () => void; salonId: string }) {
  const theme = useTheme();
  const deactivate = useDeactivateService();
  const update = useUpdateService();

  const toggleActive = useCallback(() => {
    if (service.active) {
      Alert.alert('Deactivate service?', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', onPress: () => deactivate.mutate({ salonId, serviceId: service.id }) },
      ]);
    } else {
      update.mutate({ salonId, serviceId: service.id, input: { active: true } });
    }
  }, [service, salonId, deactivate, update]);

  return (
    <Card>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={service.name}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.type.body.size, fontWeight: theme.type.label.weight, color: service.active ? theme.colors.ink : theme.colors.inkSoft }}>
              {service.name}{!service.active ? ' (Inactive)' : ''}
            </Text>
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
              {formatPrice(service.priceCents)} · {formatDuration(service.estimatedMinutes)}
            </Text>
          </View>
          <Switch value={service.active} onValueChange={toggleActive} accessibilityLabel="Active" />
        </View>
      </Pressable>
    </Card>
  );
}

function ServiceFormModal({ visible, onClose, salonId, editing }: { visible: boolean; onClose: () => void; salonId: string; editing: ServiceDto | null }) {
  const theme = useTheme();
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const insets = useSafeAreaInsets();

  const [name, setName]         = useState('');
  const [price, setPrice]       = useState('');
  const [duration, setDuration] = useState('');

  const onShow = () => {
    if (editing) {
      setName(editing.name);
      setPrice(Math.floor(editing.priceCents / 100).toString());
      setDuration(editing.estimatedMinutes.toString());
    } else {
      setName(''); setPrice(''); setDuration('');
    }
  };

  const handleSave = async () => {
    const priceCents = Math.round(parseFloat(price) * 100);
    const estimatedMinutes = parseInt(duration, 10);
    if (!name.trim()) return Alert.alert('Required', 'Name is required.');
    if (isNaN(priceCents) || priceCents < 0) return Alert.alert('Required', 'Valid price is required.');
    if (isNaN(estimatedMinutes) || estimatedMinutes < 1) return Alert.alert('Required', 'Valid duration is required.');
    try {
      if (editing) {
        await updateMutation.mutateAsync({ salonId, serviceId: editing.id, input: { name: name.trim(), priceCents, estimatedMinutes } });
      } else {
        await createMutation.mutateAsync({ salonId, input: { name: name.trim(), priceCents, estimatedMinutes } });
      }
      Alert.alert('', 'Service saved.');
      onClose();
    } catch {
      Alert.alert('', 'Could not save service.');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" onShow={onShow} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top + theme.spacing.s4 }}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.s4, gap: theme.spacing.s4, paddingBottom: insets.bottom + theme.spacing.s6 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: theme.type.title.size, fontWeight: theme.type.title.weight, color: theme.colors.ink }}>
            {editing ? 'Edit Service' : 'Add Service'}
          </Text>
          <Card style={{ gap: theme.spacing.s3 }}>
            <FieldInput label="Name"              value={name}     onChangeText={setName}     placeholder="e.g. Haircut" />
            <FieldInput label="Price (₹)"         value={price}    onChangeText={setPrice}    placeholder="e.g. 200" keyboardType="numeric" />
            <FieldInput label="Duration (minutes)" value={duration} onChangeText={setDuration} placeholder="e.g. 30"  keyboardType="numeric" />
          </Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.s3 }}>
            <View style={{ flex: 1 }}><Button label="Cancel" variant="tertiary" onPress={onClose} /></View>
            <View style={{ flex: 1 }}><Button label={isPending ? 'Saving…' : 'Save'} onPress={() => void handleSave()} /></View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FieldInput({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' }) {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ fontSize: theme.type.caption.size, fontWeight: theme.type.label.weight, color: theme.colors.inkSoft, marginBottom: theme.spacing.s1 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkSoft}
        keyboardType={keyboardType ?? 'default'}
        accessibilityLabel={label}
        style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.input, paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s3, fontSize: theme.type.body.size, color: theme.colors.ink, borderWidth: theme.borderWidth.hairline, borderColor: theme.colors.line }}
      />
    </View>
  );
}
