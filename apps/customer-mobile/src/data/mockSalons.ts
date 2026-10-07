export type QueueState = 'open' | 'paused' | 'closed';
export type OpenState = 'open' | 'closed' | 'unconfigured';

export interface MockService {
  id: string;
  name: string;
  priceCents: number;
  estimatedMinutes: number;
}

export interface MockSalon {
  id: string;
  name: string;
  photoUrl: string;
  address: string;
  city: string;
  distanceMeters: number;
  rating: { average: number; count: number };
  openState: OpenState;
  queueStatus: QueueState;
  currentToken: number | null;
  totalWaiting: number;
  etaMinutes: number | null;
  services: MockService[];
  about: string;
  tags: string[];
}

export const MOCK_SALONS: MockSalon[] = [
  {
    id: '1',
    name: 'Style Studio',
    photoUrl: 'https://picsum.photos/seed/salon1/600/300',
    address: 'Station Road, Ambarnath West',
    city: 'Ambarnath',
    distanceMeters: 1200,
    rating: { average: 4.8, count: 327 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 27,
    totalWaiting: 4,
    etaMinutes: 18,
    about: 'Premium unisex salon with expert stylists. Known for haircuts, beard grooming, and hair color.',
    tags: ['Haircut', 'Beard', 'Hair Color'],
    services: [
      { id: 's1', name: 'Haircut', priceCents: 25000, estimatedMinutes: 20 },
      { id: 's2', name: 'Beard Trim', priceCents: 15000, estimatedMinutes: 15 },
      { id: 's3', name: 'Haircut + Beard', priceCents: 40000, estimatedMinutes: 35 },
      { id: 's4', name: 'Hair Wash', priceCents: 12000, estimatedMinutes: 20 },
      { id: 's5', name: 'Hair Color', priceCents: 80000, estimatedMinutes: 60 },
    ],
  },
  {
    id: '2',
    name: 'The Barber Room',
    photoUrl: 'https://picsum.photos/seed/salon2/600/300',
    address: 'MG Road, Thane West',
    city: 'Thane',
    distanceMeters: 2400,
    rating: { average: 4.6, count: 189 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 14,
    totalWaiting: 2,
    etaMinutes: 10,
    about: 'Classic barbershop experience with modern techniques. Walk-ins welcome.',
    tags: ['Haircut', 'Beard', 'Facial'],
    services: [
      { id: 's1', name: 'Classic Haircut', priceCents: 20000, estimatedMinutes: 20 },
      { id: 's2', name: 'Beard Shaping', priceCents: 18000, estimatedMinutes: 20 },
      { id: 's3', name: 'Hot Towel Shave', priceCents: 25000, estimatedMinutes: 30 },
      { id: 's4', name: 'Facial', priceCents: 60000, estimatedMinutes: 45 },
    ],
  },
  {
    id: '3',
    name: 'Glamour Zone',
    photoUrl: 'https://picsum.photos/seed/salon3/600/300',
    address: 'Shilphata Road, Dombivli East',
    city: 'Dombivli',
    distanceMeters: 3800,
    rating: { average: 4.5, count: 412 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 38,
    totalWaiting: 7,
    etaMinutes: 35,
    about: 'Full-service unisex salon. Specialists in bridal makeup and hair treatment.',
    tags: ['Hair Color', 'Facial', 'Bridal'],
    services: [
      { id: 's1', name: 'Haircut', priceCents: 30000, estimatedMinutes: 25 },
      { id: 's2', name: 'Hair Color (Global)', priceCents: 120000, estimatedMinutes: 90 },
      { id: 's3', name: 'Facial', priceCents: 70000, estimatedMinutes: 45 },
      { id: 's4', name: 'Bridal Makeup', priceCents: 500000, estimatedMinutes: 120 },
      { id: 's5', name: 'Keratin Treatment', priceCents: 350000, estimatedMinutes: 180 },
    ],
  },
  {
    id: '4',
    name: 'Looks Unisex Salon',
    photoUrl: 'https://picsum.photos/seed/salon4/600/300',
    address: 'Ulhasnagar Central Market',
    city: 'Ulhasnagar',
    distanceMeters: 5100,
    rating: { average: 4.3, count: 94 },
    openState: 'open',
    queueStatus: 'paused',
    currentToken: 22,
    totalWaiting: 0,
    etaMinutes: null,
    about: 'Affordable and quality haircuts for the whole family. Queue temporarily paused.',
    tags: ['Haircut', 'Spa', 'Manicure'],
    services: [
      { id: 's1', name: "Men's Haircut", priceCents: 15000, estimatedMinutes: 15 },
      { id: 's2', name: "Women's Haircut", priceCents: 25000, estimatedMinutes: 30 },
      { id: 's3', name: 'Manicure', priceCents: 40000, estimatedMinutes: 30 },
      { id: 's4', name: 'Pedicure', priceCents: 45000, estimatedMinutes: 40 },
    ],
  },
  {
    id: '5',
    name: 'Kings & Queens Salon',
    photoUrl: 'https://picsum.photos/seed/salon5/600/300',
    address: 'Near Railway Station, Badlapur',
    city: 'Badlapur',
    distanceMeters: 7200,
    rating: { average: 4.7, count: 563 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 9,
    totalWaiting: 1,
    etaMinutes: 8,
    about: 'Award-winning unisex salon. Expert in Korean hair treatments and modern styling.',
    tags: ['Haircut', 'Beard', 'Spa'],
    services: [
      { id: 's1', name: 'Signature Haircut', priceCents: 45000, estimatedMinutes: 30 },
      { id: 's2', name: 'Beard Grooming', priceCents: 20000, estimatedMinutes: 20 },
      { id: 's3', name: 'Hair Spa', priceCents: 90000, estimatedMinutes: 60 },
      { id: 's4', name: 'D-Tan Facial', priceCents: 80000, estimatedMinutes: 45 },
    ],
  },
  {
    id: '6',
    name: 'Fresh Cuts Salon',
    photoUrl: 'https://picsum.photos/seed/salon6/600/300',
    address: 'Lodha Complex, Palava',
    city: 'Dombivli',
    distanceMeters: 4600,
    rating: { average: 4.2, count: 78 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 5,
    totalWaiting: 0,
    etaMinutes: 5,
    about: 'Friendly neighborhood salon. Specializing in modern haircuts and quick beard services.',
    tags: ['Haircut', 'Beard'],
    services: [
      { id: 's1', name: 'Haircut', priceCents: 18000, estimatedMinutes: 20 },
      { id: 's2', name: 'Beard Trim', priceCents: 12000, estimatedMinutes: 15 },
      { id: 's3', name: 'Hair + Beard', priceCents: 28000, estimatedMinutes: 30 },
    ],
  },
  {
    id: '7',
    name: 'Noor Beauty Lounge',
    photoUrl: 'https://picsum.photos/seed/salon7/600/300',
    address: 'Kalyan West, Near Court Naka',
    city: 'Kalyan',
    distanceMeters: 9300,
    rating: { average: 4.9, count: 741 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 51,
    totalWaiting: 9,
    etaMinutes: 45,
    about: 'Premium ladies salon with specialist beauticians. Known for bridal packages and facials.',
    tags: ['Facial', 'Bridal', 'Manicure'],
    services: [
      { id: 's1', name: 'Haircut & Styling', priceCents: 50000, estimatedMinutes: 45 },
      { id: 's2', name: 'Full Facial', priceCents: 100000, estimatedMinutes: 60 },
      { id: 's3', name: 'Manicure + Pedicure', priceCents: 90000, estimatedMinutes: 60 },
      { id: 's4', name: 'Bridal Package', priceCents: 800000, estimatedMinutes: 180 },
    ],
  },
  {
    id: '8',
    name: 'Blade & Brow',
    photoUrl: 'https://picsum.photos/seed/salon8/600/300',
    address: 'Sector 5, Airoli',
    city: 'Navi Mumbai',
    distanceMeters: 6700,
    rating: { average: 4.4, count: 216 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 16,
    totalWaiting: 3,
    etaMinutes: 20,
    about: 'Men\'s grooming specialists. Quick service, great results.',
    tags: ['Haircut', 'Beard', 'Hair Color'],
    services: [
      { id: 's1', name: 'Classic Haircut', priceCents: 22000, estimatedMinutes: 20 },
      { id: 's2', name: 'Fade Haircut', priceCents: 30000, estimatedMinutes: 25 },
      { id: 's3', name: 'Beard Design', priceCents: 20000, estimatedMinutes: 20 },
      { id: 's4', name: 'Hair Color', priceCents: 70000, estimatedMinutes: 60 },
    ],
  },
  {
    id: '9',
    name: 'The Grooming Co.',
    photoUrl: 'https://picsum.photos/seed/salon9/600/300',
    address: 'Hiranandani, Powai',
    city: 'Mumbai',
    distanceMeters: 12000,
    rating: { average: 4.7, count: 982 },
    openState: 'open',
    queueStatus: 'open',
    currentToken: 33,
    totalWaiting: 6,
    etaMinutes: 30,
    about: 'Luxury grooming experience. Walk in, feel the difference.',
    tags: ['Haircut', 'Spa', 'Facial'],
    services: [
      { id: 's1', name: 'Premium Haircut', priceCents: 60000, estimatedMinutes: 30 },
      { id: 's2', name: 'Luxury Facial', priceCents: 150000, estimatedMinutes: 60 },
      { id: 's3', name: 'Full Body Massage', priceCents: 200000, estimatedMinutes: 90 },
    ],
  },
  {
    id: '10',
    name: 'Snip & Style',
    photoUrl: 'https://picsum.photos/seed/salon10/600/300',
    address: 'Kopri Colony, Thane East',
    city: 'Thane',
    distanceMeters: 3100,
    rating: { average: 4.1, count: 55 },
    openState: 'closed',
    queueStatus: 'closed',
    currentToken: null,
    totalWaiting: 0,
    etaMinutes: null,
    about: 'Affordable family salon. Opens at 10 AM daily.',
    tags: ['Haircut', 'Beard'],
    services: [
      { id: 's1', name: 'Haircut', priceCents: 10000, estimatedMinutes: 15 },
      { id: 's2', name: 'Kids Haircut', priceCents: 8000, estimatedMinutes: 15 },
      { id: 's3', name: 'Beard Trim', priceCents: 8000, estimatedMinutes: 10 },
    ],
  },
];

export const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'haircut', label: 'Haircut', icon: '✂️' },
  { id: 'beard', label: 'Beard', icon: '🧔' },
  { id: 'color', label: 'Hair Color', icon: '🎨' },
  { id: 'facial', label: 'Facial', icon: '✨' },
  { id: 'spa', label: 'Spa', icon: '💆' },
  { id: 'manicure', label: 'Manicure', icon: '💅' },
  { id: 'bridal', label: 'Bridal', icon: '👰' },
];

export function filterSalonsByCategory(salons: MockSalon[], categoryId: string): MockSalon[] {
  if (categoryId === 'all') return salons;
  return salons.filter((s) =>
    s.tags.some((t) => t.toLowerCase().includes(categoryId.replace('color', 'hair color'))),
  );
}

export function getWaitLabel(salon: MockSalon): string {
  if (salon.openState === 'closed') return 'Closed';
  if (salon.queueStatus === 'paused') return 'Paused';
  if (salon.etaMinutes === null || salon.etaMinutes === 0) return 'Available now';
  if (salon.etaMinutes <= 10) return `~${salon.etaMinutes} min`;
  if (salon.etaMinutes <= 25) return `~${salon.etaMinutes} min`;
  return `~${salon.etaMinutes} min`;
}

export function formatPrice(priceCents: number): string {
  return `₹${Math.floor(priceCents / 100)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
