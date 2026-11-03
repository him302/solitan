import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, Card } from '@soliton/ui';
import type { AssistantAnswerDto, AssistantAudience } from '@soliton/api-contract';
import { useAskAssistant, useAssistantStatus } from '../src/hooks/useAssistant';
import { useAuthStore } from '../src/auth/authStore';

interface Turn {
  question: string;
  answer: AssistantAnswerDto | null;
  failed?: boolean;
}

/**
 * Solitan AI Assistant (Part 12).
 *
 * The mode badge is not decoration. Part 12 requires that the assistant never present a
 * local answer as though it came from Gemini, so every answer is labelled with the engine
 * that produced it, and a fallback says why it fell back.
 */
export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Owners and staff get the operational question set; everyone else the customer one.
  const audience: AssistantAudience =
    user?.role === 'owner' || user?.role === 'staff' ? 'owner' : 'customer';

  const { data: status } = useAssistantStatus();
  const ask = useAskAssistant();

  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 3) return;

      setQuestion('');
      setTurns((prev) => [...prev, { question: trimmed, answer: null }]);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      ask.mutate(
        { question: trimmed, audience },
        {
          onSuccess: (answer) => {
            setTurns((prev) => {
              const next = [...prev];
              const last = next.findLastIndex((t) => t.answer === null && !t.failed);
              if (last >= 0) next[last] = { ...next[last], answer };
              return next;
            });
            requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
          },
          onError: () => {
            // The assistant itself is offline-capable, but reaching it still needs the
            // API. Said plainly rather than shown as an empty bubble.
            setTurns((prev) => {
              const next = [...prev];
              const last = next.findLastIndex((t) => t.answer === null && !t.failed);
              if (last >= 0) next[last] = { ...next[last], failed: true };
              return next;
            });
          },
        },
      );
    },
    [ask, audience],
  );

  const examples = status?.examples ?? [];

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
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: theme.type.title.size,
              fontWeight: theme.type.title.weight,
              color: theme.colors.ink,
            }}
          >
            Solitan Assistant
          </Text>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {audience === 'owner' ? 'Help running your salon' : 'Help using Solitan'}
          </Text>
        </View>
        {status && <ModeBadge mode={status.activeMode} />}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.s4,
          paddingBottom: theme.spacing.s5,
          gap: theme.spacing.s3,
        }}
      >
        {turns.length === 0 && (
          <Card>
            <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size }}>
              Ask me anything about {audience === 'owner' ? 'running your queue' : 'using Solitan'}.
            </Text>
            <Text
              style={{
                color: theme.colors.inkSoft,
                fontSize: theme.type.caption.size,
                marginTop: theme.spacing.s2,
              }}
            >
              {status?.geminiConfigured
                ? 'Answers come from Solitan’s own guide, with Google Gemini when it is available.'
                : 'Answers come from Solitan’s own guide. It works offline and needs no account.'}
            </Text>
          </Card>
        )}

        {turns.map((turn, index) => (
          <View key={index} style={{ gap: theme.spacing.s2 }}>
            <View
              style={{
                alignSelf: 'flex-end',
                maxWidth: '85%',
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radius.card,
                paddingHorizontal: theme.spacing.s3,
                paddingVertical: theme.spacing.s2,
              }}
            >
              <Text style={{ color: theme.colors.accentInk, fontSize: theme.type.body.size }}>
                {turn.question}
              </Text>
            </View>

            {turn.failed ? (
              <Card>
                <Text style={{ color: theme.colors.danger }}>
                  I could not reach the assistant. Check your connection and try again.
                </Text>
              </Card>
            ) : turn.answer === null ? (
              <Card>
                <Text style={{ color: theme.colors.inkSoft }}>Thinking…</Text>
              </Card>
            ) : (
              <AnswerCard answer={turn.answer} onFollowUp={submit} />
            )}
          </View>
        ))}

        {turns.length === 0 && examples.length > 0 && (
          <View style={{ gap: theme.spacing.s2 }}>
            {examples.map((example) => (
              <Pressable
                key={example}
                onPress={() => submit(example)}
                accessibilityRole="button"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.line,
                  borderRadius: theme.radius.button,
                  paddingHorizontal: theme.spacing.s3,
                  paddingVertical: theme.spacing.s3,
                }}
              >
                <Text style={{ color: theme.colors.ink }}>{example}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.s2,
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s3,
          borderTopWidth: 1,
          borderTopColor: theme.colors.line,
        }}
      >
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question…"
          placeholderTextColor={theme.colors.inkSoft}
          onSubmitEditing={() => submit(question)}
          returnKeyType="send"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.colors.line,
            borderRadius: theme.radius.input,
            paddingHorizontal: theme.spacing.s3,
            paddingVertical: theme.spacing.s3,
            color: theme.colors.ink,
            backgroundColor: theme.colors.surface,
          }}
        />
        <Pressable
          onPress={() => submit(question)}
          disabled={ask.isPending || question.trim().length < 3}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.s4,
            borderRadius: theme.radius.button,
            backgroundColor: theme.colors.accent,
            opacity: ask.isPending || question.trim().length < 3 ? 0.5 : 1,
          }}
        >
          <Text style={{ color: theme.colors.accentInk, fontWeight: '700' }}>Ask</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AnswerCard({
  answer,
  onFollowUp,
}: {
  answer: AssistantAnswerDto;
  onFollowUp: (question: string) => void;
}) {
  const theme = useTheme();

  return (
    <Card>
      <Text style={{ color: theme.colors.ink, fontSize: theme.type.body.size, lineHeight: 22 }}>
        {answer.answer}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.s2,
          marginTop: theme.spacing.s3,
        }}
      >
        <ModeBadge mode={answer.mode} />
        {answer.fallbackReason && (
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {fallbackExplanation(answer.fallbackReason)}
          </Text>
        )}
      </View>

      {answer.suggestions.length > 0 && (
        <View style={{ marginTop: theme.spacing.s3, gap: theme.spacing.s1 }}>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {answer.unmatched ? 'I can answer these:' : 'Related:'}
          </Text>
          {answer.suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => onFollowUp(suggestion)}
              accessibilityRole="button"
            >
              <Text style={{ color: theme.colors.accent, fontSize: theme.type.caption.size }}>
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

/**
 * Names the engine that answered. Required by Part 12: a local answer must never look
 * like a Gemini one.
 */
function ModeBadge({ mode }: { mode: AssistantAnswerDto['mode'] }) {
  const theme = useTheme();
  const isGemini = mode === 'gemini';

  return (
    <View
      style={{
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.s2,
        paddingVertical: 2,
        backgroundColor: isGemini ? theme.colors.info : theme.colors.surface2,
      }}
    >
      <Text
        style={{
          fontSize: theme.type.caption.size,
          fontWeight: '700',
          color: isGemini ? '#FFFFFF' : theme.colors.inkSoft,
        }}
      >
        {isGemini ? 'Gemini' : 'Solitan guide'}
      </Text>
    </View>
  );
}

function fallbackExplanation(reason: NonNullable<AssistantAnswerDto['fallbackReason']>): string {
  switch (reason) {
    case 'quota_exceeded':
      return 'AI limit reached for today';
    case 'provider_unavailable':
      return 'AI unavailable right now';
    case 'provider_error':
      return 'AI could not answer';
    case 'disabled_by_policy':
      return 'Offline mode';
    default:
      return '';
  }
}
