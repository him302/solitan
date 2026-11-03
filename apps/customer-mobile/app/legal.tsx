import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@soliton/ui';

/**
 * Terms of use and privacy notice (Part 6F).
 *
 * Written to describe what this prototype actually does, not boilerplate copied from
 * elsewhere: it names the data Solitan stores, says plainly that no payment or external
 * messaging provider is connected, and does not promise rights the app cannot deliver.
 * A real deployment must have this reviewed — that is stated in the text rather than
 * hidden, so nobody mistakes it for cleared legal copy.
 */
export default function LegalScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();

  const showPrivacyFirst = section === 'privacy';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.s3,
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: theme.spacing.s3,
        }}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={{ fontSize: 22, color: theme.colors.ink }}>‹</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          Terms & Privacy
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface2,
            borderRadius: theme.radius.card,
            padding: theme.spacing.s3,
          }}
        >
          <Text style={{ color: theme.colors.ink, fontSize: theme.type.caption.size }}>
            Solitan is an early-stage product in pilot. This notice describes what the app
            does today. It has not been reviewed by a lawyer and is not a substitute for
            legal advice.
          </Text>
        </View>

        {showPrivacyFirst ? (
          <>
            <Privacy />
            <Terms />
          </>
        ) : (
          <>
            <Terms />
            <Privacy />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Terms() {
  return (
    <Section title="Terms of use">
      <Para>
        Solitan lets you join a queue at a participating business and watch your place in
        it. Solitan is not the business: the service itself, its prices, its staff and its
        opening hours are the business&apos;s responsibility, and any dispute about a visit
        is between you and them.
      </Para>
      <Para>
        Waiting times shown in the app are estimates calculated from how long services are
        taking, how many staff are working and what the business has told us. They are not
        guarantees, and a place in a queue is not a reserved appointment.
      </Para>
      <Para>
        Please cancel if you cannot attend. Businesses can mark customers who do not arrive
        as no-shows, and a business may choose to limit customers with repeated no-shows.
      </Para>
      <Para>
        Do not use Solitan to abuse or harass staff or other customers. A business may
        remove you from its queue, and we may suspend an account, for doing so.
      </Para>
      <Para>
        Solitan is provided as-is during the pilot. Features may change, and the service
        may be unavailable at times.
      </Para>
    </Section>
  );
}

function Privacy() {
  return (
    <Section title="Privacy">
      <Para>
        <Strong>What we store.</Strong> Your name and phone number, so a business can
        identify you when it is your turn. Your email, if you signed in with one. The
        queues you have joined, the services you chose and when, which forms your activity
        history. Any reviews or complaints you submit.
      </Para>
      <Para>
        <Strong>What the business sees.</Strong> Your name, the service you asked for, and
        your position in their queue. Other customers never see your details — a public
        salon page shows only totals, such as how many people are waiting.
      </Para>
      <Para>
        <Strong>Location.</Strong> If you allow it, your location is used to sort nearby
        businesses by distance for that request only. It is not stored and not shared.
      </Para>
      <Para>
        <Strong>Notifications.</Strong> Updates appear inside the app, and on your device
        if you allow notifications. No SMS, WhatsApp or email provider is connected to
        Solitan, so we do not send messages through those channels.
      </Para>
      <Para>
        <Strong>Payments.</Strong> No payment provider is connected. Solitan does not take
        payments and never asks for card details. Pay the business directly, as you
        normally would.
      </Para>
      <Para>
        <Strong>AI assistance.</Strong> The in-app assistant answers from a guide that
        ships with the app and needs no internet. If an operator has enabled Google Gemini,
        the text of your question is sent to Google to answer it; every answer tells you
        which of the two replied. Your queue history and personal details are not sent.
      </Para>
      <Para>
        <Strong>Your data.</Strong> Ask us to correct or delete your account data and we
        will. Records a business needs for its own history, such as a completed service,
        may be retained by that business.
      </Para>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.s2 }}>
      <Text
        style={{
          fontSize: theme.type.section.size,
          fontWeight: theme.type.section.weight,
          color: theme.colors.ink,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.body.size, lineHeight: 22 }}>
      {children}
    </Text>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{children}</Text>;
}
