import type { AssistantAudience } from '@soliton/api-contract';

/**
 * The Solitan assistant's local knowledge (Part 12).
 *
 * This is the primary engine, not a stub: it needs no key, no network and no account, so
 * it works in the offline demo mode the zero-cost policy requires. Gemini, when enabled,
 * is an enhancement layered over this.
 *
 * Entries are written to answer the questions Part 12 lists verbatim, plus the obvious
 * neighbours a real user would ask.
 */
export interface KnowledgeEntry {
  /** The canonical question, shown as a suggestion. */
  question: string;
  /** Words and phrases that should match this entry. Lowercase. */
  keywords: string[];
  answer: string;
  audience: AssistantAudience | 'both';
}

export const KNOWLEDGE_BASE: readonly KnowledgeEntry[] = [
  // ── Customer: the basics ──────────────────────────────────────────────────
  {
    question: 'How does Solitan work?',
    keywords: ['how does solitan work', 'what is solitan', 'how it works', 'explain solitan'],
    audience: 'both',
    answer:
      'Solitan lets you join a salon queue from wherever you are, instead of waiting on a chair in the shop. You pick a salon, choose a service and join the queue. You get a token number and can watch your position move in real time. When your turn is close, Solitan tells you, so you can time your walk over and arrive about when the chair is free.',
  },
  {
    question: 'How do I join a queue?',
    keywords: ['join a queue', 'join queue', 'get a token', 'book my place', 'how do i join'],
    audience: 'customer',
    answer:
      'Open the Discover tab, pick a salon that is open, then tap Join Queue on its page. Choose the service you want and confirm. You will get a token number straight away, along with your position and an estimated wait. You can only hold one place per salon at a time.',
  },
  {
    question: 'Where is my token?',
    keywords: ['where is my token', 'my token', 'find my token', 'see my position', 'my place'],
    audience: 'customer',
    answer:
      'Your active token is on the Activity tab, and Solitan opens it for you when your turn is near. It shows your token number, how many people are ahead of you, your estimated wait and who will be serving you if the salon has assigned someone.',
  },
  {
    question: 'Why has my waiting time increased?',
    keywords: [
      'waiting time increased',
      'wait longer',
      'why is my wait',
      'eta changed',
      'estimate changed',
      'taking longer',
    ],
    audience: 'customer',
    answer:
      'Estimates move because real services do. A cut ahead of you may be taking longer, a staff member may have gone off shift, or the salon may have told us it is running late — in which case you will see the reason on the salon page. Solitan recalculates from what is actually happening rather than a fixed figure per person, so the number is an honest estimate, never a promise.',
  },
  {
    question: 'What happens if I arrive late?',
    keywords: ['arrive late', 'running late', 'if i am late', 'miss my turn', 'late'],
    audience: 'customer',
    answer:
      'Tell the salon through the app as soon as you know — open your token and report that you are running late. Many salons will hold your place or move you back a slot rather than cancel you. If you simply do not arrive, the salon can mark you as a no-show, and some salons restrict customers with repeated no-shows.',
  },
  {
    question: 'How do I cancel my queue?',
    keywords: ['cancel my queue', 'leave the queue', 'cancel token', 'give up my place', 'cancel'],
    audience: 'customer',
    answer:
      'Open your token from the Activity tab and choose to leave the queue. Your place is released immediately for the next person. Cancelling is not recorded as a no-show, so it does not count against you — but do cancel rather than just not turning up.',
  },
  {
    question: 'How do I contact a business?',
    keywords: ['contact a business', 'contact the salon', 'call the salon', 'phone the salon'],
    audience: 'customer',
    answer:
      'The salon page shows the contact details the owner has published, along with their address and notice board. If something went wrong with a visit, you can also raise a complaint from your activity history, which the Solitan team can review.',
  },
  {
    question: 'How does the live queue work?',
    keywords: ['live queue', 'real time', 'how does the queue update', 'does it update'],
    audience: 'both',
    answer:
      'The queue is live. When the salon calls the next customer, starts a service or finishes one, every token updates within moments — you do not need to refresh. Estimates are recalculated from how far current services have actually progressed, how many staff are on shift and what each of them can do.',
  },
  {
    question: 'Is my phone number shared with the salon?',
    keywords: ['phone number', 'privacy', 'my data', 'personal information', 'share my number'],
    audience: 'customer',
    answer:
      'The salon sees your name and the service you asked for so they can call you when it is your turn. Other customers never see your details — a salon page only shows aggregate numbers like how many people are waiting.',
  },

  // ── Owner: running the queue ──────────────────────────────────────────────
  {
    question: 'How do I manage my queue?',
    keywords: ['manage my queue', 'run my queue', 'queue controls', 'how do i manage'],
    audience: 'owner',
    answer:
      'The Queue tab is your control room. Open the queue to start accepting customers, then work down the list: call the next customer, start their service, and mark it complete when done. You can pause when you need a break, switch to limited to keep serving walk-ins while closing remote joins, and close at the end of the day. Every action updates customers instantly.',
  },
  {
    question: 'How do I add staff?',
    keywords: ['add staff', 'add a staff member', 'new staff', 'staff management', 'add employee'],
    audience: 'owner',
    answer:
      'Go to the Staff tab and tap Add staff member. You need their phone number — they sign in with a one-time code sent to it, so there is nothing to install or activate on your side. Then choose which services each person can do. That matters: Solitan only routes a customer to someone trained for the service they asked for.',
  },
  {
    question: 'How can I reduce waiting time?',
    keywords: ['reduce waiting time', 'shorter wait', 'faster queue', 'reduce wait'],
    answer:
      'Three things move the number most. Keep your service durations honest — if a cut really takes 40 minutes, saying 30 makes every estimate behind it wrong. Mark staff on shift as they start, because Solitan only counts people who are actually available. And assign capabilities to more than one person where you can, so a single specialist does not become a bottleneck.',
    audience: 'owner',
  },
  {
    question: 'How should I manage peak hours?',
    keywords: ['peak hours', 'busy period', 'rush', 'weekend rush', 'manage peak'],
    audience: 'owner',
    answer:
      'Set a queue capacity so the list cannot grow longer than you can realistically serve — customers then see that you are full instead of joining and waiting an hour. Put every available person on shift, and use limited mode if you want to prioritise customers already in the shop. A short notice on the board explaining the wait reduces the number of people asking at the counter.',
  },
  {
    question: 'How do I handle delayed services?',
    keywords: ['delayed service', 'running late', 'delay', 'behind schedule', 'handle delay'],
    audience: 'owner',
    answer:
      'Use Running Late on the Queue tab and pick how far behind you are. Everyone still waiting gets an updated estimate and a short explanation, so they stop wondering and you stop fielding questions. Add a reason if there is one. If you catch up, you can take the time back.',
  },
  {
    question: 'How do I manage multiple staff members?',
    keywords: ['multiple staff', 'several staff', 'many staff', 'parallel', 'two chairs'],
    audience: 'owner',
    answer:
      'Add each person on the Staff tab and set what they can do. Solitan then estimates waits assuming you serve several customers at once, rather than one at a time, and keeps two staff from being handed the same customer. The Staff tab shows who is serving whom, how many each person has completed today, and who customers have asked for by name.',
  },
  {
    question: 'How can I improve customer experience?',
    keywords: ['improve customer experience', 'better experience', 'happier customers', 'reviews'],
    audience: 'owner',
    answer:
      'Accurate information beats fast service. Keep durations realistic, announce delays early, and keep your opening hours and service list current so nobody arrives to a closed shop. Call the next customer a few minutes before you are ready, so they are walking over rather than being waited on. Customers who are not kept guessing leave better reviews.',
  },
  {
    question: 'How do I add a walk-in customer?',
    keywords: ['walk-in', 'walk in', 'customer at the counter', 'add a customer manually', 'in person'],
    audience: 'owner',
    answer:
      'On the Queue tab choose Add Walk-in, enter their name and the service, and they get the next token like anyone else. A phone number is optional — add it and, if they already use Solitan, they can follow their place in their own app. You do not need to ask them to install anything.',
  },
  {
    question: 'What do the queue statuses mean?',
    keywords: ['queue status', 'open limited paused closed', 'what does limited mean', 'statuses'],
    audience: 'owner',
    answer:
      'Open accepts everyone. Limited keeps serving people in the shop but stops new remote joins — useful when you are nearly at capacity. Paused holds the queue without losing anyone’s place, for a break. Closed stops accepting customers for the day. Customers see the current state on your salon page.',
  },
  {
    question: 'How do I set my prices and services?',
    keywords: ['prices', 'set prices', 'services', 'add a service', 'service duration'],
    audience: 'owner',
    answer:
      'The Services tab is where you add each service with its price and how long it really takes. The duration is not cosmetic — Solitan builds every waiting estimate from it, so an optimistic number makes your whole queue look wrong to customers.',
  },
  {
    question: 'How do I post a notice to customers?',
    keywords: ['notice', 'announcement', 'tell customers', 'notice board', 'lunch break'],
    audience: 'owner',
    answer:
      'Use Announce on the Queue tab. Notices appear on your salon page, so waiting customers see them — a lunch break, a staff member off sick, or special hours. It is the cheapest way to stop people asking the same question at the counter.',
  },
];

/** Example questions for the empty state, tailored to who is asking. */
export function exampleQuestions(audience: AssistantAudience): string[] {
  return KNOWLEDGE_BASE.filter((e) => e.audience === audience || e.audience === 'both')
    .slice(0, 5)
    .map((e) => e.question);
}
