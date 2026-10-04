import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@soliton/ui';
import { EmptyState, ErrorState, LoadingState, SalonCard } from '@soliton/ui';
import type { DiscoverySalonDto, DiscoverySort } from '@soliton/api-contract';
import { useDiscovery, type DiscoveryFilters } from '../../src/hooks/useDiscovery';
import { formatDistance, formatPrice } from '../../src/utils/format';

const PAGE_SIZE = 20;

/** Customer discovery home screen. */
export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [activeSort, setActiveSort] = useState<DiscoverySort>('name');
  const [offset, setOffset] = useState(0);

  // Debounced search: use the text after the user stops typing.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const onSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      setOffset(0);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => setDebouncedQuery(text.trim()), 400);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const filters: DiscoveryFilters = useMemo(
    () => ({
      q: debouncedQuery || undefined,
      sort: activeSort,
      limit: PAGE_SIZE,
      offset,
    }),
    [debouncedQuery, activeSort, offset],
  );

  const { data, isLoading, isError, refetch } = useDiscovery(filters);

  const openStateLabel = (state: string) => {
    if (state === 'open') return t('discovery.open');
    if (state === 'unconfigured') return t('discovery.unconfigured');
    return t('discovery.closed');
  };

  const renderSalon = useCallback(
    ({ item }: { item: DiscoverySalonDto }) => {
      const distance = formatDistance(item.distanceMeters);
      const previewLabel =
        item.servicePreview.length > 0
          ? item.servicePreview
              .slice(0, 2)
              .map((s) => `${s.name} ${formatPrice(s.priceCents)}`)
              .join(' · ')
          : undefined;

      return (
        <View style={{ paddingHorizontal: theme.spacing.s4, marginBottom: theme.spacing.s3 }}>
          <SalonCard
            name={item.name}
            distanceLabel={distance ?? undefined}
            waitingLabel={previewLabel}
            open={item.openState === 'open'}
            onPress={() => router.push(`/salon/${item.id}`)}
          />
        </View>
      );
    },
    [theme, router],
  );

  const ListHeader = useMemo(
    () => (
      <View style={{ paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s3 }}>
        {/* Search bar */}
        <TextInput
          placeholder={t('discovery.searchPlaceholder')}
          placeholderTextColor={theme.colors.inkSoft}
          value={searchText}
          onChangeText={onSearchChange}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.input,
            paddingHorizontal: theme.spacing.s4,
            paddingVertical: theme.spacing.s3,
            fontSize: theme.type.body.size,
            color: theme.colors.ink,
            borderWidth: theme.borderWidth.hairline,
            borderColor: theme.colors.line,
          }}
          accessibilityLabel={t('common.search')}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Sort chips */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.s2,
            marginTop: theme.spacing.s3,
          }}
        >
          <SortChip
            label={t('discovery.sortName')}
            active={activeSort === 'name'}
            onPress={() => {
              setActiveSort('name');
              setOffset(0);
            }}
          />
          <SortChip
            label={t('discovery.sortNearest')}
            active={activeSort === 'nearest'}
            onPress={() => {
              setActiveSort('nearest');
              setOffset(0);
            }}
          />
        </View>

        {data && (
          <Text
            style={{
              color: theme.colors.inkSoft,
              fontSize: theme.type.caption.size,
              marginTop: theme.spacing.s3,
            }}
          >
            {data.items.length === 0
              ? ''
              : `${t('discovery.allSalons')} · ${data.appliedSort === 'nearest' ? t('discovery.sortNearest') : t('discovery.sortName')}`}
          </Text>
        )}
      </View>
    ),
    [theme, searchText, activeSort, data, t, onSearchChange],
  );

  // Pagination
  const loadMore = useCallback(() => {
    if (data?.page.nextOffset !== null && data?.page.nextOffset !== undefined) {
      setOffset(data.page.nextOffset);
    }
  }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {/* Title */}
      <View style={{ paddingHorizontal: theme.spacing.s4, paddingVertical: theme.spacing.s4 }}>
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          {t('discovery.title')}
        </Text>
      </View>

      {isLoading ? (
        <LoadingState label={t('common.loading')} />
      ) : isError ? (
        <ErrorState
          title={t('errors.loadFailed')}
          body={t('errors.networkError')}
          onRetry={() => refetch()}
          retryLabel={t('common.retry')}
        />
      ) : data && data.items.length === 0 ? (
        <>
          {ListHeader}
          <EmptyState title={t('discovery.noSalons')} body={t('discovery.noSalonsBody')} />
        </>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderSalon}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.s5 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

/** Sort filter chip. */
function SortChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingHorizontal: theme.spacing.s4,
        paddingVertical: theme.spacing.s2,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.accent : theme.colors.surface,
        borderWidth: theme.borderWidth.hairline,
        borderColor: active ? theme.colors.accent : theme.colors.line,
      }}
    >
      <Text
        style={{
          fontSize: theme.type.caption.size,
          fontWeight: theme.type.label.weight,
          color: active ? theme.colors.accentInk : theme.colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
