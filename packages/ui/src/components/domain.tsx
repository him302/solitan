import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './layout';
import { Status } from './status/Status';

export interface SalonCardProps {
  name: string;
  distanceLabel?: string;
  waitingLabel?: string;
  ratingLabel?: string;
  open?: boolean;
  onPress?: () => void;
}

/** Discovery salon card: live wait + open status + rating. */
export function SalonCard({
  name,
  distanceLabel,
  waitingLabel,
  ratingLabel,
  open = true,
  onPress,
}: SalonCardProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
            }}
          >
            {name}
          </Text>
          <Status kind={open ? 'success' : 'neutral'} label={open ? 'Open' : 'Closed'} />
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.s4, marginTop: theme.spacing.s2 }}>
          {distanceLabel ? (
            <Text style={{ color: theme.colors.inkSoft }}>{distanceLabel}</Text>
          ) : null}
          {waitingLabel ? (
            <Text style={{ color: theme.colors.inkSoft }}>{waitingLabel}</Text>
          ) : null}
          {ratingLabel ? <Text style={{ color: theme.colors.inkSoft }}>{ratingLabel}</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

export interface ServiceRowProps {
  name: string;
  durationLabel: string;
  priceLabel: string;
  selected?: boolean;
  onPress?: () => void;
}

/** A selectable service in a salon's service list. */
export function ServiceRow({
  name,
  durationLabel,
  priceLabel,
  selected = false,
  onPress,
}: ServiceRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s3,
      }}
    >
      <View>
        <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size }}>{name}</Text>
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
          {durationLabel}
        </Text>
      </View>
      <Text
        style={{
          color: selected ? theme.colors.accent : theme.colors.ink,
          fontWeight: theme.type.label.weight,
        }}
      >
        {priceLabel}
      </Text>
    </Pressable>
  );
}

export interface QueueGlyphProps {
  position: number;
  total: number;
  maxDots?: number;
}

/** Abstracted "you vs. the line" — your dot highlighted. */
export function QueueGlyph({ position, total, maxDots = 8 }: QueueGlyphProps) {
  const theme = useTheme();
  const dots = Math.min(total, maxDots);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`You are position ${position} of ${total}`}
      style={{ flexDirection: 'row', gap: theme.spacing.s2, alignItems: 'center' }}
    >
      {Array.from({ length: dots }).map((_, index) => {
        const isYou = index === Math.min(position - 1, dots - 1);
        return (
          <View
            key={index}
            style={{
              width: isYou ? 14 : 10,
              height: isYou ? 14 : 10,
              borderRadius: 999,
              backgroundColor: isYou ? theme.colors.accent : theme.colors.line,
            }}
          />
        );
      })}
    </View>
  );
}

export interface EtaBlockProps {
  minLabel: string;
  maxLabel?: string;
  asOf?: string;
  trend?: 'faster' | 'steady' | 'slower';
}

/** Hero ETA display with tabular figures (digits do not jitter on update). */
export function EtaBlock({ minLabel, maxLabel, asOf, trend = 'steady' }: EtaBlockProps) {
  const theme = useTheme();
  const trendColor =
    trend === 'faster'
      ? theme.colors.success
      : trend === 'slower'
        ? theme.colors.warning
        : theme.colors.inkSoft;
  const trendGlyph = trend === 'faster' ? '↓' : trend === 'slower' ? '↑' : '→';
  const value = maxLabel ? `~${minLabel}–${maxLabel}` : `~${minLabel}`;
  return (
    <View accessibilityRole="text" accessibilityLabel={`Estimated wait ${value} minutes`}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.s2 }}>
        <Text
          style={{
            fontSize: theme.type.numeric.size,
            lineHeight: theme.type.numeric.line,
            fontWeight: theme.type.numeric.weight,
            color: theme.colors.ink,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
        <Text style={{ color: trendColor, fontSize: theme.type.section.size }}>{trendGlyph}</Text>
      </View>
      {asOf ? (
        <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
          as of {asOf}
        </Text>
      ) : null}
    </View>
  );
}

export interface TokenCardProps {
  token: string;
  positionLabel?: string;
  statusLabel?: string;
}

/** The join confirmation / live token surface anchor. */
export function TokenCard({ token, positionLabel, statusLabel }: TokenCardProps) {
  const theme = useTheme();
  return (
    <Card>
      <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
        Your token
      </Text>
      <Text
        style={{
          fontSize: theme.type.numeric.size,
          lineHeight: theme.type.numeric.line,
          fontWeight: theme.type.numeric.weight,
          color: theme.colors.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {token}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: theme.spacing.s2,
        }}
      >
        {positionLabel ? (
          <Text style={{ color: theme.colors.inkSoft }}>{positionLabel}</Text>
        ) : null}
        {statusLabel ? <Status kind="info" label={statusLabel} /> : null}
      </View>
    </Card>
  );
}
