import { useCallback, useMemo, useState } from 'react';
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
import type { StaffMemberDto } from '@soliton/api-contract';
import { useMySalon } from '../../src/hooks/useMySalon';
import { useSalonServices } from '../../src/hooks/useServices';
import {
  useAddStaff,
  useRemoveStaff,
  useSetStaffServices,
  useStaffRoster,
  useUpdateStaff,
} from '../../src/hooks/useStaff';

/**
 * Owner-only staff management (Part 8). Reachable only from the owner tab bar, and every
 * write it performs is owner-checked on the server as well — hiding the tab is a UX
 * measure, not the security boundary.
 */
export default function StaffScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: salon } = useMySalon();
  const salonId = salon?.id;
  const { data: roster, isLoading, isError, refetch } = useStaffRoster(salonId);
  const { data: services = [] } = useSalonServices(salonId);

  const [addVisible, setAddVisible] = useState(false);
  const [editing, setEditing] = useState<StaffMemberDto | null>(null);

  const updateStaff = useUpdateStaff();
  const removeStaff = useRemoveStaff();

  const toggleShift = useCallback(
    (member: StaffMemberDto, onShift: boolean) => {
      if (!salonId) return;
      updateStaff.mutate(
        { salonId, staffId: member.id, input: { onShift } },
        {
          onError: (error: Error) =>
            Alert.alert('Could not update shift', error.message || 'Please try again.'),
        },
      );
    },
    [salonId, updateStaff],
  );

  const confirmRemove = useCallback(
    (member: StaffMemberDto) => {
      if (!salonId) return;
      Alert.alert(
        `Remove ${member.name}?`,
        'They will stop appearing on the roster and can no longer take customers. Their completed services stay in your history, and you can add them again later.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () =>
              removeStaff.mutate(
                { salonId, staffId: member.id },
                {
                  onError: (error: Error) =>
                    Alert.alert('Could not remove', error.message || 'Please try again.'),
                },
              ),
          },
        ],
      );
    },
    [salonId, removeStaff],
  );

  if (isLoading) return <LoadingState label="Loading staff…" />;
  if (isError) {
    return <ErrorState title="Could not load staff" onRetry={() => refetch()} retryLabel="Retry" />;
  }

  const members = roster?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s3 }}>
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          Staff
        </Text>
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
          {roster
            ? `${roster.onShiftCount} on shift of ${members.filter((m) => m.active).length} active`
            : ''}
        </Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s7,
          gap: theme.spacing.s3,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No staff yet"
            body="Add the people who work here so you can assign customers and show accurate waiting times."
          />
        }
        renderItem={({ item }) => (
          <StaffRow
            member={item}
            onToggleShift={(value) => toggleShift(item, value)}
            onEditServices={() => setEditing(item)}
            onRemove={() => confirmRemove(item)}
          />
        )}
      />

      <View
        style={{
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s3,
        }}
      >
        <Button label="Add staff member" onPress={() => setAddVisible(true)} />
      </View>

      <AddStaffModal
        visible={addVisible}
        salonId={salonId}
        onClose={() => setAddVisible(false)}
      />

      <CapabilitiesModal
        member={editing}
        salonId={salonId}
        services={services.filter((s) => s.active)}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

function StaffRow({
  member,
  onToggleShift,
  onEditServices,
  onRemove,
}: {
  member: StaffMemberDto;
  onToggleShift: (value: boolean) => void;
  onEditServices: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();

  const capabilityLabel =
    member.capabilities.length === 0
      ? 'No services assigned'
      : member.capabilities.map((c) => c.name).join(', ');

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 }}>
            <Text
              style={{
                fontSize: theme.type.section.size,
                fontWeight: theme.type.section.weight,
                color: theme.colors.ink,
              }}
            >
              {member.name}
            </Text>
            {member.role === 'owner' && (
              <Text
                style={{
                  fontSize: theme.type.caption.size,
                  color: theme.colors.accent,
                  fontWeight: '700',
                }}
              >
                OWNER
              </Text>
            )}
            {!member.active && (
              <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>
                REMOVED
              </Text>
            )}
          </View>
          {member.phoneMasked && (
            <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
              {member.phoneMasked}
            </Text>
          )}
        </View>

        {member.active && (
          <View style={{ alignItems: 'center' }}>
            <Switch value={member.onShift} onValueChange={onToggleShift} />
            <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>
              {member.onShift ? 'On shift' : 'Off'}
            </Text>
          </View>
        )}
      </View>

      {/* Workload, so an owner can see who is free before assigning anyone. */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.s4, marginTop: theme.spacing.s3 }}>
        <Stat
          label="Serving"
          value={
            member.workload.servingTokenNumber ? `#${member.workload.servingTokenNumber}` : '—'
          }
        />
        <Stat label="Done today" value={String(member.workload.completedToday)} />
        <Stat label="Requested" value={String(member.workload.preferredWaiting)} />
      </View>

      <Text
        style={{
          marginTop: theme.spacing.s3,
          color: member.capabilities.length === 0 ? theme.colors.warning : theme.colors.inkSoft,
          fontSize: theme.type.caption.size,
        }}
      >
        {capabilityLabel}
      </Text>

      <View style={{ flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 }}>
        <Pressable onPress={onEditServices} accessibilityRole="button">
          <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Edit services</Text>
        </Pressable>
        {member.active && (
          <>
            <Text style={{ color: theme.colors.line }}>|</Text>
            <Pressable onPress={onRemove} accessibilityRole="button">
              <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>Remove</Text>
            </Pressable>
          </>
        )}
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: theme.type.label.size,
          fontWeight: theme.type.label.weight,
          color: theme.colors.ink,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft }}>
        {label}
      </Text>
    </View>
  );
}

function AddStaffModal({
  visible,
  salonId,
  onClose,
}: {
  visible: boolean;
  salonId: string | undefined;
  onClose: () => void;
}) {
  const theme = useTheme();
  const addStaff = useAddStaff();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const reset = () => {
    setPhone('');
    setName('');
  };

  const submit = () => {
    if (!salonId || phone.trim().length < 8) return;
    addStaff.mutate(
      { salonId, input: { phone: phone.trim(), name: name.trim() || undefined, role: 'staff' } },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (error: Error) =>
          Alert.alert('Could not add staff', error.message || 'Please try again.'),
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
            padding: theme.spacing.s4,
            gap: theme.spacing.s3,
          }}
        >
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
            }}
          >
            Add staff member
          </Text>

          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            They sign in with this phone number using a one-time code. If they already have
            a Solitan account, it will be linked.
          </Text>

          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
          />
          <Field
            label="Name (optional)"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Priya"
          />

          <Button
            label={addStaff.isPending ? 'Adding…' : 'Add'}
            onPress={submit}
            disabled={addStaff.isPending || phone.trim().length < 8}
          />
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Capability editing. The whole set is submitted at once, matching the API, so removing a
 * service is the same operation as adding one.
 */
function CapabilitiesModal({
  member,
  salonId,
  services,
  onClose,
}: {
  member: StaffMemberDto | null;
  salonId: string | undefined;
  services: { id: string; name: string }[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const setServices = useSetStaffServices();

  const initial = useMemo(
    () => new Set(member?.capabilities.map((c) => c.serviceId) ?? []),
    [member],
  );
  const [selected, setSelected] = useState<Set<string>>(initial);

  // Re-seed when a different member is opened.
  const [seededFor, setSeededFor] = useState<string | null>(member?.id ?? null);
  if (member && seededFor !== member.id) {
    setSeededFor(member.id);
    setSelected(initial);
  }

  const toggle = (serviceId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const submit = () => {
    if (!salonId || !member) return;
    setServices.mutate(
      { salonId, staffId: member.id, input: { serviceIds: [...selected] } },
      {
        onSuccess: onClose,
        onError: (error: Error) =>
          Alert.alert('Could not save services', error.message || 'Please try again.'),
      },
    );
  };

  return (
    <Modal visible={!!member} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
            padding: theme.spacing.s4,
            maxHeight: '75%',
          }}
        >
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
              marginBottom: theme.spacing.s2,
            }}
          >
            {member?.name} can do
          </Text>

          <ScrollView style={{ marginBottom: theme.spacing.s3 }}>
            {services.length === 0 ? (
              <Text style={{ color: theme.colors.inkSoft }}>
                Add services to your salon first, then choose which ones each person can do.
              </Text>
            ) : (
              services.map((svc) => (
                <Pressable
                  key={svc.id}
                  onPress={() => toggle(svc.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected.has(svc.id) }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.s3,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.line,
                  }}
                >
                  <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size }}>
                    {svc.name}
                  </Text>
                  <Text
                    style={{
                      color: selected.has(svc.id) ? theme.colors.accent : theme.colors.inkSoft,
                      fontWeight: '700',
                    }}
                  >
                    {selected.has(svc.id) ? '✓' : '+'}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>

          <Button
            label={setServices.isPending ? 'Saving…' : 'Save'}
            onPress={submit}
            disabled={setServices.isPending}
          />
          <View style={{ height: theme.spacing.s2 }} />
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Field({
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
  keyboardType?: 'default' | 'phone-pad';
}) {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: theme.type.label.size,
          fontWeight: theme.type.label.weight,
          color: theme.colors.ink,
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
        style={{
          borderWidth: 1,
          borderColor: theme.colors.line,
          borderRadius: theme.radius.input,
          paddingHorizontal: theme.spacing.s3,
          paddingVertical: theme.spacing.s3,
          color: theme.colors.ink,
          backgroundColor: theme.colors.bg,
          fontSize: theme.type.body.size,
        }}
      />
    </View>
  );
}
