import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  AskAssistantInput,
  AssistantAnswerDto,
  AssistantStatusDto,
} from '@soliton/api-contract';
import { api } from '../api';

/**
 * Which engine will answer, used to set expectations before the first question and to
 * populate the empty state with questions the assistant can actually handle.
 */
export function useAssistantStatus() {
  return useQuery<AssistantStatusDto>({
    queryKey: ['assistant-status'],
    queryFn: () => api.assistant.status(),
    // Changes only when an operator reconfigures the server.
    staleTime: 5 * 60_000,
  });
}

export function useAskAssistant() {
  return useMutation<AssistantAnswerDto, Error, AskAssistantInput>({
    mutationFn: (input) => api.assistant.ask(input),
  });
}
