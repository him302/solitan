import type { AssistantAudience } from '@soliton/api-contract';
import { KNOWLEDGE_BASE, type KnowledgeEntry } from './knowledge-base';

/**
 * Rule-based retrieval over the local knowledge base (Part 12).
 *
 * Deliberately simple and explainable — keyword and token overlap scoring, no embeddings,
 * no model, no network. It runs in well under a millisecond, works offline, and its
 * behaviour can be reasoned about from the source, which matters for a fallback that must
 * never be the thing that breaks.
 */

export interface LocalMatch {
  entry: KnowledgeEntry;
  score: number;
}

/** Words carrying no retrieval signal; removed so they cannot outvote real terms. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'can',
  'could', 'should', 'would', 'will', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it',
  'its', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'but', 'if', 'how',
  'what', 'when', 'where', 'why', 'who', 'this', 'that', 'there', 'then', 'so', 'as',
  'from', 'by', 'about', 'please', 'tell', 'know', 'get', 'got',
]);

/** Below this, a match is treated as a guess and reported as unmatched. */
const CONFIDENCE_FLOOR = 2;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Scores one entry against a question.
 *
 * A keyword phrase appearing in the question is worth much more than a single shared
 * word, so "how do I cancel my queue" lands on the cancel entry rather than on any entry
 * that happens to mention queues.
 */
export function scoreEntry(entry: KnowledgeEntry, question: string, tokens: string[]): number {
  const normalized = question.toLowerCase();
  let score = 0;

  for (const keyword of entry.keywords) {
    if (normalized.includes(keyword)) {
      // Longer phrases are stronger evidence than short ones.
      score += 4 + keyword.split(' ').length;
    }
  }

  const questionTokens = new Set(tokens);
  const entryTokens = new Set([
    ...tokenize(entry.question),
    ...entry.keywords.flatMap((k) => tokenize(k)),
  ]);
  for (const token of questionTokens) {
    if (entryTokens.has(token)) score += 1;
  }

  return score;
}

export interface LocalAnswer {
  answer: string;
  suggestions: string[];
  unmatched: boolean;
}

/**
 * Answers from the local knowledge base.
 *
 * When nothing scores above the floor, it says so plainly and offers the questions it can
 * answer, rather than returning the least-bad entry as though it were a real answer.
 * Part 12 requires the assistant not to pretend.
 */
export function answerLocally(question: string, audience: AssistantAudience): LocalAnswer {
  const tokens = tokenize(question);
  const candidates = KNOWLEDGE_BASE.filter(
    (entry) => entry.audience === audience || entry.audience === 'both',
  );

  const ranked = candidates
    .map((entry) => ({ entry, score: scoreEntry(entry, question, tokens) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score < CONFIDENCE_FLOOR) {
    return {
      answer:
        'I could not find an answer to that in my guide. I can help with joining and tracking a queue, waiting times, cancelling, and — for salon owners — managing the queue, staff and delays. Try one of the questions below, or contact the salon directly if it is about a specific visit.',
      suggestions: candidates.slice(0, 5).map((entry) => entry.question),
      unmatched: true,
    };
  }

  // Near-misses become suggestions, so a partial match still leads somewhere.
  const alternatives = ranked
    .slice(1)
    .filter((candidate) => candidate.score >= CONFIDENCE_FLOOR)
    .slice(0, 3)
    .map((candidate) => candidate.entry.question);

  return { answer: best.entry.answer, suggestions: alternatives, unmatched: false };
}

/** Knowledge used to ground a Gemini answer, so it cannot invent Solitan behaviour. */
export function groundingContext(audience: AssistantAudience, question: string): string {
  const tokens = tokenize(question);
  return KNOWLEDGE_BASE.filter((e) => e.audience === audience || e.audience === 'both')
    .map((entry) => ({ entry, score: scoreEntry(entry, question, tokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ entry }) => `Q: ${entry.question}\nA: ${entry.answer}`)
    .join('\n\n');
}
