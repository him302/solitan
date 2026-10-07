import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@soliton/ui';
import { useQuery } from '@tanstack/react-query';
import type { AnalyticsDatePreset } from '@soliton/api-contract';
import {
  useSalonOverview,
  useSalonQueueAnalytics,
  useSalonAppointmentAnalytics,
  useSalonServiceAnalytics,
  useSalonCustomerAnalytics,
  useSalonPeakHours,
  useSalonHealthScore,
} from '../../src/hooks/useReporting';
import { api } from '../../src/api';

const PRESETS: { label: string; value: AnalyticsDatePreset }[] = [
  { label: 'Today',   value: 'today' },
  { label: '7 Days',  value: '7d' },
  { label: '30 Days', value: '30d' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HEALTH_COLORS: Record<string, string> = {
  excellent: '#1F7A38',
  good: '#1F7A38',
  fair: '#9A5B00',
  needs_attention: '#B32430',
  insufficient_data: '#605E57',
};

export default function SalonAnalyticsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(theme);

  const [preset, setPreset] = useState<AnalyticsDatePreset>('7d');

  const { data: mine } = useQuery({
    queryKey: ['salon-mine'],
    queryFn: () => api.salons.mine(),
    staleTime: 60_000,
  });
  const salonId = mine?.id ?? null;

  const { data: overview } = useSalonOverview(salonId, 'today');
  const { data: queueStats, isLoading: loadingQueue } = useSalonQueueAnalytics(salonId, preset);
  const { data: apptStats, isLoading: loadingAppt } = useSalonAppointmentAnalytics(salonId, preset);
  const { data: services, isLoading: loadingSvc } = useSalonServiceAnalytics(salonId, preset);
  const { data: customers, isLoading: loadingCust } = useSalonCustomerAnalytics(salonId, preset);
  const { data: peakHours } = useSalonPeakHours(salonId, '30d');
  const { data: health } = useSalonHealthScore(salonId);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Analytics</Text>
      </View>

      <View style={s.filterRow}>
        {PRESETS.map((p) => (
          <Text key={p.value} onPress={() => setPreset(p.value)} style={[s.filterChip, preset === p.value && s.filterChipActive]}>
            {p.label}
          </Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {overview && (
          <Section title="Today at a Glance" s={s}>
            <View style={s.statRow}>
              <MiniStat label="Live Queue"    value={String(overview.currentQueueSize)}   theme={theme} />
              <MiniStat label="Completed"     value={String(overview.todayCompleted)}     theme={theme} />
              <MiniStat label="Appointments"  value={String(overview.todayAppointments)}  theme={theme} />
              <MiniStat label="Avg Wait"      value={overview.avgWaitMinutes !== null ? `${overview.avgWaitMinutes}m` : '—'} theme={theme} />
            </View>
          </Section>
        )}

        <Section title="Queue" s={s}>
          {loadingQueue ? <ActivityIndicator color={theme.colors.accent} /> : queueStats ? (
            <>
              <View style={s.statRow}>
                <MiniStat label="Total"     value={String(queueStats.totalEntries)} theme={theme} />
                <MiniStat label="Completed" value={String(queueStats.completed)}   theme={theme} />
                <MiniStat label="No-shows"  value={String(queueStats.noShows)}     theme={theme} />
              </View>
              <MetricRow label="Avg wait"     value={queueStats.avgWaitMinutes !== null ? `${queueStats.avgWaitMinutes} min` : 'Insufficient data'} s={s} />
              <MetricRow label="Max wait"     value={queueStats.maxWaitMinutes !== null ? `${queueStats.maxWaitMinutes} min` : '—'} s={s} />
              <MetricRow label="Abandonment"  value={queueStats.abandonmentRate !== null ? `${Math.round(queueStats.abandonmentRate * 100)}%` : '—'} s={s} />
            </>
          ) : <Text style={s.empty}>No data</Text>}
        </Section>

        <Section title="Appointments" s={s}>
          {loadingAppt ? <ActivityIndicator color={theme.colors.accent} /> : apptStats ? (
            <>
              <View style={s.statRow}>
                <MiniStat label="Booked"    value={String(apptStats.total)}     theme={theme} />
                <MiniStat label="Completed" value={String(apptStats.completed)} theme={theme} />
                <MiniStat label="No-show"   value={String(apptStats.noShows)}   theme={theme} />
              </View>
              <MetricRow label="Completion rate"   value={apptStats.completionRate !== null ? `${Math.round(apptStats.completionRate * 100)}%` : '—'} s={s} />
              <MetricRow label="Cancellation rate" value={apptStats.cancellationRate !== null ? `${Math.round(apptStats.cancellationRate * 100)}%` : '—'} s={s} />
            </>
          ) : <Text style={s.empty}>No data</Text>}
        </Section>

        <Section title="Service Popularity" s={s}>
          {loadingSvc ? <ActivityIndicator color={theme.colors.accent} /> :
           !services?.items.length ? <Text style={s.empty}>No data yet</Text> : (
            services.items.map((svc) => {
              const total = svc.queueEntries + svc.appointments;
              return (
                <View key={svc.serviceId} style={s.svcRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.svcName}>{svc.serviceName}</Text>
                    <Text style={s.svcSub}>{total} visit{total !== 1 ? 's' : ''} · {svc.completed} completed</Text>
                  </View>
                  <Text style={s.svcCount}>{total}</Text>
                </View>
              );
            })
          )}
        </Section>

        <Section title="Customer Retention (30 days)" s={s}>
          {loadingCust ? <ActivityIndicator color={theme.colors.accent} /> : customers ? (
            <>
              <View style={s.statRow}>
                <MiniStat label="Served"    value={String(customers.totalServed)}           theme={theme} />
                <MiniStat label="New"       value={String(customers.newCustomers)}          theme={theme} />
                <MiniStat label="Returning" value={String(customers.returningCustomers)}    theme={theme} />
              </View>
              <MetricRow label="Return rate" value={customers.repeatVisitRate !== null ? `${Math.round(customers.repeatVisitRate * 100)}%` : customers.totalServed === 0 ? 'No data' : '0%'} s={s} />
            </>
          ) : <Text style={s.empty}>No data</Text>}
        </Section>

        {peakHours && peakHours.items.length > 0 && (
          <Section title="Peak Hours (30 days)" s={s}>
            {peakHours.items.slice(0, 5).map((item, i) => (
              <View key={i} style={s.peakRow}>
                <Text style={s.peakLabel}>{WEEKDAY_LABELS[item.weekday]} {item.hour.toString().padStart(2, '0')}:00</Text>
                <View style={s.peakBarWrap}>
                  <View style={[s.peakBar, { width: `${Math.round((item.count / (peakHours.items[0]?.count ?? 1)) * 100)}%` as unknown as number }]} />
                </View>
                <Text style={s.peakCount}>{item.count}</Text>
              </View>
            ))}
          </Section>
        )}

        {health && (
          <Section title="Salon Health (90 days)" s={s}>
            {health.score === null ? (
              <Text style={s.empty}>{health.components.queueCompletion.detail}</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 36, fontWeight: '700', color: HEALTH_COLORS[health.label] ?? theme.colors.ink }}>{health.score}</Text>
                  <View>
                    <Text style={{ fontSize: theme.type.body.size, fontWeight: '600', color: theme.colors.ink }}>/ 100</Text>
                    <Text style={{ fontSize: theme.type.caption.size, color: HEALTH_COLORS[health.label] ?? theme.colors.inkSoft, fontWeight: '600' }}>
                      {health.label.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                {Object.entries(health.components).map(([key, comp]) => (
                  <View key={key} style={s.healthRow}>
                    <Text style={s.healthLabel}>{formatHealthKey(key)}</Text>
                    <Text style={s.healthValue}>{comp.label}</Text>
                  </View>
                ))}
              </>
            )}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

function formatHealthKey(key: string): string {
  const map: Record<string, string> = {
    queueCompletion: 'Queue reliability',
    appointmentCompletion: 'Appt completion',
    noShowRate: 'No-show rate',
    averageRating: 'Customer rating',
    complaintRate: 'Complaint rate',
  };
  return map[key] ?? key;
}

function Section({ title, children, s }: { title: string; children: React.ReactNode; s: ReturnType<typeof styles> }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function MiniStat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.colors.inkSoft, textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value, s }: { label: string; value: string; s: ReturnType<typeof styles> }) {
  return (
    <View style={s.metricRow}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
    </View>
  );
}

function styles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.bg },
    header: { paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
    headerTitle: { fontSize: theme.type.section.size, fontWeight: theme.type.section.weight, color: theme.colors.ink },
    filterRow: { flexDirection: 'row', gap: theme.spacing.s2, padding: theme.spacing.s3, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
    filterChip: { paddingHorizontal: theme.spacing.s3, paddingVertical: theme.spacing.s2, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.line, fontSize: theme.type.caption.size, color: theme.colors.ink },
    filterChipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent, color: theme.colors.accentInk, fontWeight: '700' },
    section: { margin: theme.spacing.s4, marginBottom: 0, backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, padding: theme.spacing.s4 },
    sectionTitle: { fontSize: theme.type.label.size, fontWeight: theme.type.label.weight, color: theme.colors.ink, marginBottom: theme.spacing.s3 },
    statRow: { flexDirection: 'row', marginBottom: theme.spacing.s3 },
    metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.s2, borderTopWidth: 1, borderTopColor: theme.colors.line },
    metricLabel: { fontSize: theme.type.body.size, color: theme.colors.inkSoft },
    metricValue: { fontSize: theme.type.body.size, color: theme.colors.ink, fontWeight: '600' },
    empty: { fontSize: theme.type.body.size, color: theme.colors.inkSoft, textAlign: 'center', paddingVertical: theme.spacing.s3 },
    svcRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.s2, borderTopWidth: 1, borderTopColor: theme.colors.line },
    svcName: { fontSize: theme.type.body.size, color: theme.colors.ink, fontWeight: '500' },
    svcSub: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft, marginTop: 2 },
    svcCount: { fontSize: theme.type.section.size, fontWeight: '700', color: theme.colors.accent, width: 36, textAlign: 'right' },
    peakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    peakLabel: { width: 72, fontSize: 12, color: theme.colors.inkSoft },
    peakBarWrap: { flex: 1, height: 8, backgroundColor: theme.colors.line, borderRadius: 4, overflow: 'hidden' },
    peakBar: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 4 },
    peakCount: { width: 28, fontSize: 12, color: theme.colors.inkSoft, textAlign: 'right' },
    healthRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.s2, borderTopWidth: 1, borderTopColor: theme.colors.line },
    healthLabel: { fontSize: theme.type.body.size, color: theme.colors.inkSoft },
    healthValue: { fontSize: theme.type.body.size, color: theme.colors.ink, fontWeight: '500' },
  });
}
