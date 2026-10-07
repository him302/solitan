/**
 * Salon reviews dashboard — salon owner sees their reviews with rating summary.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@soliton/ui';
import { useQuery } from '@tanstack/react-query';
import type { ReviewDto, ReviewStatus, SalonRatingSummary } from '@soliton/api-contract';
import { api } from '../../src/api';

const STATUS_LABELS: Record<ReviewStatus, string> = {
  published: 'Published',
  hidden: 'Hidden',
  under_review: 'Under Review',
  removed: 'Removed',
};

function StarBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <Text style={{ width: 24, color: '#605E57', fontSize: 12 }}>{label}★</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: '#E9E3D6', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F7C65B', borderRadius: 3 }} />
      </View>
      <Text style={{ width: 20, color: '#605E57', fontSize: 12, textAlign: 'right' }}>{count}</Text>
    </View>
  );
}

export default function SalonReviewsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data: mine } = useQuery({
    queryKey: ['salon-mine'],
    queryFn: () => api.salons.mine(),
    staleTime: 60_000,
  });

  const salonId = mine?.id ?? null;

  const { data: ratingData } = useQuery<SalonRatingSummary | null>({
    queryKey: ['salon-rating', salonId],
    queryFn: () => salonId ? api.reviews.ratingForSalon(salonId) : null,
    enabled: !!salonId,
    staleTime: 60_000,
  });

  const { data: reviewsData, isLoading } = useQuery<{ items: ReviewDto[]; nextCursor: string | null }>({
    queryKey: ['salon-owner-reviews', salonId],
    queryFn: () =>
      salonId
        ? api.reviews.listForSalonOwner()
        : { items: [], nextCursor: null },
    enabled: !!salonId,
    staleTime: 30_000,
  });

  const s = styles(theme);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Reviews</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Rating summary */}
        {ratingData && (
          <View style={s.ratingCard}>
            <Text style={s.bigRating}>
              {ratingData.count > 0 ? ratingData.average.toFixed(1) : '—'} ★
            </Text>
            <Text style={s.ratingCount}>
              {ratingData.count > 0 ? `based on ${ratingData.count} reviews` : 'No reviews yet'}
            </Text>
            {ratingData.count > 0 && (
              <View style={{ marginTop: 12 }}>
                {([5, 4, 3, 2, 1] as const).map((star) => (
                  <StarBar
                    key={star}
                    label={String(star)}
                    count={ratingData.distribution[star] ?? 0}
                    total={ratingData.count}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Review list */}
        {isLoading ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
        ) : !reviewsData?.items.length ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No reviews yet</Text>
            <Text style={s.emptyBody}>Reviews from customers will appear here.</Text>
          </View>
        ) : (
          reviewsData.items.map((review) => (
            <View key={review.id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <Text style={s.stars}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </Text>
                <View style={[s.statusBadge, review.status === 'hidden' && s.statusBadgeWarn]}>
                  <Text style={s.statusText}>{STATUS_LABELS[review.status]}</Text>
                </View>
              </View>
              {review.comment ? (
                <Text style={s.comment}>"{review.comment}"</Text>
              ) : (
                <Text style={s.noComment}>No comment</Text>
              )}
              <Text style={s.reviewMeta}>
                {review.customerName ?? 'Customer'} · {new Date(review.createdAt).toLocaleDateString('en-IN')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function styles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      paddingHorizontal: theme.spacing.s4,
      paddingVertical: theme.spacing.s4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.line,
    },
    headerTitle: {
      fontSize: theme.type.section.size,
      fontWeight: theme.type.section.weight,
      color: theme.colors.ink,
    },
    ratingCard: {
      margin: theme.spacing.s4,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: theme.spacing.s4,
    },
    bigRating: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    ratingCount: {
      fontSize: theme.type.caption.size,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
    emptyState: {
      padding: theme.spacing.s6,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: theme.type.section.size,
      fontWeight: theme.type.section.weight,
      color: theme.colors.ink,
    },
    emptyBody: {
      fontSize: theme.type.body.size,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      marginTop: theme.spacing.s2,
    },
    reviewCard: {
      marginHorizontal: theme.spacing.s4,
      marginBottom: theme.spacing.s3,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: theme.spacing.s4,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.s2,
    },
    stars: { fontSize: 18, color: theme.colors.warmYellow },
    statusBadge: {
      backgroundColor: theme.colors.surface2,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.s2,
      paddingVertical: 2,
    },
    statusBadgeWarn: { backgroundColor: theme.colors.warning + '22' },
    statusText: { fontSize: 11, color: theme.colors.inkSoft },
    comment: { fontSize: theme.type.body.size, color: theme.colors.ink, marginBottom: 6 },
    noComment: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft, fontStyle: 'italic', marginBottom: 6 },
    reviewMeta: { fontSize: theme.type.caption.size, color: theme.colors.inkSoft },
  });
}
