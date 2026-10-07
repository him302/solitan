import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

/**
 * Deterministic development seed. Idempotent (upsert by fixed UUIDs) and respects
 * INV-OWNER: every salon owner has a matching active SalonStaff(owner) row. No customer
 * activity (no queue entries) is created. Multiple Raipur salons for realistic discovery.
 */
const prisma = new PrismaClient();

// Fixed ids keep the seed deterministic and re-runnable.
const ID = {
  // Users
  admin: '00000000-0000-4000-8000-000000000001',
  owner: '00000000-0000-4000-8000-000000000002',
  staff: '00000000-0000-4000-8000-000000000003',
  newOwner: '00000000-0000-4000-8000-000000000004',
  owner2: '00000000-0000-4000-8000-000000000005',
  owner3: '00000000-0000-4000-8000-000000000006',
  owner4: '00000000-0000-4000-8000-000000000007',
  owner5: '00000000-0000-4000-8000-000000000008',
  customer: '00000000-0000-4000-8000-000000000009',

  // Salon 1 — Soliton Demo Salon (MG Road)
  salon1: '00000000-0000-4000-8000-000000000010',
  salon1OwnerStaff: '00000000-0000-4000-8000-000000000020',
  salon1Staff: '00000000-0000-4000-8000-000000000021',
  salon1SvcHaircut: '00000000-0000-4000-8000-000000000030',
  salon1SvcBeard: '00000000-0000-4000-8000-000000000031',
  salon1SvcColor: '00000000-0000-4000-8000-000000000032',
  salon1Chair1: '00000000-0000-4000-8000-000000000040',
  salon1Chair2: '00000000-0000-4000-8000-000000000041',
  salon1Queue: '00000000-0000-4000-8000-000000000050',

  // Salon 2 — Looks Unisex Salon (Pandri)
  salon2: '00000000-0000-4000-8000-000000000011',
  salon2OwnerStaff: '00000000-0000-4000-8000-000000000022',
  salon2SvcHaircut: '00000000-0000-4000-8000-000000000033',
  salon2SvcFacial: '00000000-0000-4000-8000-000000000034',
  salon2SvcSpa: '00000000-0000-4000-8000-000000000035',
  salon2SvcShave: '00000000-0000-4000-8000-000000000036',
  salon2Queue: '00000000-0000-4000-8000-000000000051',

  // Salon 3 — Raipur Cuts (Telibandha)
  salon3: '00000000-0000-4000-8000-000000000012',
  salon3OwnerStaff: '00000000-0000-4000-8000-000000000023',
  salon3SvcHaircut: '00000000-0000-4000-8000-000000000037',
  salon3SvcBeard: '00000000-0000-4000-8000-000000000038',
  salon3Queue: '00000000-0000-4000-8000-000000000052',

  // Salon 4 — Glamour Studio (Shankar Nagar)
  salon4: '00000000-0000-4000-8000-000000000013',
  salon4OwnerStaff: '00000000-0000-4000-8000-000000000024',
  salon4SvcBridal: '00000000-0000-4000-8000-000000000039',
  salon4SvcMakeup: '00000000-0000-4000-8000-00000000003a',
  salon4SvcHairSpa: '00000000-0000-4000-8000-00000000003b',
  salon4SvcHaircut: '00000000-0000-4000-8000-00000000003c',
  salon4Queue: '00000000-0000-4000-8000-000000000053',

  // Salon 5 — Trim & Tone (Devendra Nagar) — no hours configured
  salon5: '00000000-0000-4000-8000-000000000014',
  salon5OwnerStaff: '00000000-0000-4000-8000-000000000025',
  salon5SvcHaircut: '00000000-0000-4000-8000-00000000003d',
  salon5SvcInactive: '00000000-0000-4000-8000-00000000003e',
  salon5Queue: '00000000-0000-4000-8000-000000000054',
} as const;

// Raipur coordinates for different salons.
const COORDS = {
  mgRoad: { lon: 81.6296, lat: 21.2514 },
  pandri: { lon: 81.6355, lat: 21.2458 },
  telibandha: { lon: 81.644, lat: 21.24 },
  shankarNagar: { lon: 81.6195, lat: 21.257 },
  devendraNagar: { lon: 81.613, lat: 21.249 },
};

/**
 * DEV-ONLY credential for every seeded account. It exists so the apps can sign in locally;
 * it is not a secret and must never be used outside local development.
 */
const DEV_PASSWORD = 'Passw0rd!dev';

async function main(): Promise<void> {
  const passwordHash = await hash(DEV_PASSWORD);

  // === Users ===
  const users = [
    { id: ID.admin, email: 'admin@soliton.local', name: 'Platform Admin', role: 'admin' as const },
    { id: ID.owner, email: 'owner@soliton.local', name: 'Salon Owner', role: 'owner' as const },
    { id: ID.staff, email: 'staff@soliton.local', name: 'Salon Staff', role: 'staff' as const },
    {
      id: ID.newOwner,
      email: 'newowner@soliton.local',
      name: 'New Owner',
      role: 'owner' as const,
    },
    {
      id: ID.owner2,
      email: 'owner2@soliton.local',
      name: 'Priya Sharma',
      role: 'owner' as const,
    },
    {
      id: ID.owner3,
      email: 'owner3@soliton.local',
      name: 'Rahul Verma',
      role: 'owner' as const,
    },
    {
      id: ID.owner4,
      email: 'owner4@soliton.local',
      name: 'Anjali Patel',
      role: 'owner' as const,
    },
    {
      id: ID.owner5,
      email: 'owner5@soliton.local',
      name: 'Vikram Singh',
      role: 'owner' as const,
    },
    {
      id: ID.customer,
      email: 'customer@soliton.local',
      name: 'Test Customer',
      role: 'customer' as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { passwordHash },
      create: { ...user, passwordHash },
    });
  }

  // === Salons ===
  interface SalonSeed {
    id: string;
    ownerId: string;
    name: string;
    city: string;
    address: string;
    status: 'active' | 'pending';
    coords: { lon: number; lat: number };
    ownerStaffId: string;
    queueId: string;
  }

  const salons: SalonSeed[] = [
    {
      id: ID.salon1,
      ownerId: ID.owner,
      name: 'Soliton Demo Salon',
      city: 'Raipur',
      address: 'MG Road, Raipur',
      status: 'active',
      coords: COORDS.mgRoad,
      ownerStaffId: ID.salon1OwnerStaff,
      queueId: ID.salon1Queue,
    },
    {
      id: ID.salon2,
      ownerId: ID.owner2,
      name: 'Looks Unisex Salon',
      city: 'Raipur',
      address: 'Pandri, Raipur',
      status: 'active',
      coords: COORDS.pandri,
      ownerStaffId: ID.salon2OwnerStaff,
      queueId: ID.salon2Queue,
    },
    {
      id: ID.salon3,
      ownerId: ID.owner3,
      name: 'Raipur Cuts',
      city: 'Raipur',
      address: 'Telibandha, Raipur',
      status: 'active',
      coords: COORDS.telibandha,
      ownerStaffId: ID.salon3OwnerStaff,
      queueId: ID.salon3Queue,
    },
    {
      id: ID.salon4,
      ownerId: ID.owner4,
      name: 'Glamour Studio',
      city: 'Raipur',
      address: 'Shankar Nagar, Raipur',
      status: 'active',
      coords: COORDS.shankarNagar,
      ownerStaffId: ID.salon4OwnerStaff,
      queueId: ID.salon4Queue,
    },
    {
      id: ID.salon5,
      ownerId: ID.owner5,
      name: 'Trim & Tone',
      city: 'Raipur',
      address: 'Devendra Nagar, Raipur',
      status: 'active',
      coords: COORDS.devendraNagar,
      ownerStaffId: ID.salon5OwnerStaff,
      queueId: ID.salon5Queue,
    },
  ];

  for (const salon of salons) {
    await prisma.salon.upsert({
      where: { id: salon.id },
      update: {},
      create: {
        id: salon.id,
        ownerId: salon.ownerId,
        name: salon.name,
        status: salon.status,
        city: salon.city,
        address: salon.address,
        queueStatus: 'closed',
      },
    });

    // INV-OWNER: owner must have an active SalonStaff(owner) row.
    await prisma.salonStaff.upsert({
      where: { id: salon.ownerStaffId },
      update: {},
      create: {
        id: salon.ownerStaffId,
        salonId: salon.id,
        userId: salon.ownerId,
        role: 'owner',
        active: true,
      },
    });

    // Queue row (foundation only — no queue behaviour in Phase 1).
    await prisma.queue.upsert({
      where: { id: salon.queueId },
      update: {},
      create: { id: salon.queueId, salonId: salon.id, status: 'closed' },
    });

  }

  // Salon 1 staff member
  await prisma.salonStaff.upsert({
    where: { id: ID.salon1Staff },
    update: {},
    create: {
      id: ID.salon1Staff,
      salonId: ID.salon1,
      userId: ID.staff,
      role: 'staff',
      active: true,
    },
  });

  // === Services ===
  interface ServiceSeed {
    id: string;
    salonId: string;
    name: string;
    priceCents: number;
    estimatedMinutes: number;
    active?: boolean;
  }

  const services: ServiceSeed[] = [
    // Salon 1 — Soliton Demo Salon
    {
      id: ID.salon1SvcHaircut,
      salonId: ID.salon1,
      name: 'Haircut',
      priceCents: 20000,
      estimatedMinutes: 30,
    },
    {
      id: ID.salon1SvcBeard,
      salonId: ID.salon1,
      name: 'Beard Trim',
      priceCents: 10000,
      estimatedMinutes: 15,
    },
    {
      id: ID.salon1SvcColor,
      salonId: ID.salon1,
      name: 'Coloring',
      priceCents: 80000,
      estimatedMinutes: 60,
    },

    // Salon 2 — Looks Unisex Salon
    {
      id: ID.salon2SvcHaircut,
      salonId: ID.salon2,
      name: 'Haircut',
      priceCents: 25000,
      estimatedMinutes: 30,
    },
    {
      id: ID.salon2SvcFacial,
      salonId: ID.salon2,
      name: 'Facial',
      priceCents: 50000,
      estimatedMinutes: 45,
    },
    {
      id: ID.salon2SvcSpa,
      salonId: ID.salon2,
      name: 'Hair Spa',
      priceCents: 60000,
      estimatedMinutes: 50,
    },
    {
      id: ID.salon2SvcShave,
      salonId: ID.salon2,
      name: 'Clean Shave',
      priceCents: 8000,
      estimatedMinutes: 15,
    },

    // Salon 3 — Raipur Cuts
    {
      id: ID.salon3SvcHaircut,
      salonId: ID.salon3,
      name: 'Haircut',
      priceCents: 15000,
      estimatedMinutes: 25,
    },
    {
      id: ID.salon3SvcBeard,
      salonId: ID.salon3,
      name: 'Beard Trim',
      priceCents: 8000,
      estimatedMinutes: 10,
    },

    // Salon 4 — Glamour Studio
    {
      id: ID.salon4SvcBridal,
      salonId: ID.salon4,
      name: 'Bridal Makeup',
      priceCents: 500000,
      estimatedMinutes: 120,
    },
    {
      id: ID.salon4SvcMakeup,
      salonId: ID.salon4,
      name: 'Party Makeup',
      priceCents: 150000,
      estimatedMinutes: 60,
    },
    {
      id: ID.salon4SvcHairSpa,
      salonId: ID.salon4,
      name: 'Hair Spa',
      priceCents: 80000,
      estimatedMinutes: 50,
    },
    {
      id: ID.salon4SvcHaircut,
      salonId: ID.salon4,
      name: 'Haircut',
      priceCents: 30000,
      estimatedMinutes: 30,
    },

    // Salon 5 — Trim & Tone (one active, one inactive)
    {
      id: ID.salon5SvcHaircut,
      salonId: ID.salon5,
      name: 'Haircut',
      priceCents: 12000,
      estimatedMinutes: 20,
    },
    {
      id: ID.salon5SvcInactive,
      salonId: ID.salon5,
      name: 'Styling (coming soon)',
      priceCents: 30000,
      estimatedMinutes: 40,
      active: false,
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: {},
      create: { ...svc, active: svc.active ?? true },
    });
  }

  // === Chairs (Salon 1 only — others are optional for Phase 1) ===
  await prisma.chair.upsert({
    where: { id: ID.salon1Chair1 },
    update: {},
    create: { id: ID.salon1Chair1, salonId: ID.salon1, label: 'Chair 1' },
  });
  await prisma.chair.upsert({
    where: { id: ID.salon1Chair2 },
    update: {},
    create: { id: ID.salon1Chair2, salonId: ID.salon1, label: 'Chair 2' },
  });

  // === Staff capabilities (Salon 1) ===
  const capabilities: Array<{ salonStaffId: string; serviceId: string }> = [
    { salonStaffId: ID.salon1OwnerStaff, serviceId: ID.salon1SvcHaircut },
    { salonStaffId: ID.salon1OwnerStaff, serviceId: ID.salon1SvcBeard },
    { salonStaffId: ID.salon1OwnerStaff, serviceId: ID.salon1SvcColor },
    { salonStaffId: ID.salon1Staff, serviceId: ID.salon1SvcHaircut },
    { salonStaffId: ID.salon1Staff, serviceId: ID.salon1SvcBeard },
  ];
  for (const cap of capabilities) {
    await prisma.staffService.upsert({
      where: {
        salonStaffId_serviceId: { salonStaffId: cap.salonStaffId, serviceId: cap.serviceId },
      },
      update: {},
      create: { ...cap, salonId: ID.salon1 },
    });
  }

  // === Phase 5 IDs ===
  const P5_IDS = {
    appt1: '00000000-0000-4000-8500-000000000001',
    appt2: '00000000-0000-4000-8500-000000000002',
    review1: '00000000-0000-4000-8500-000000000010',
    review2: '00000000-0000-4000-8500-000000000011',
    complaint1: '00000000-0000-4000-8500-000000000020',
    payment1: '00000000-0000-4000-8500-000000000030',
  } as const;

  // Two completed appointments for the test customer at salon1
  const pastDate1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const pastDate2 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

  for (const [apptId, svcId, scheduledAt] of [
    [P5_IDS.appt1, ID.salon1SvcHaircut, pastDate1],
    [P5_IDS.appt2, ID.salon1SvcBeard, pastDate2],
  ] as const) {
    await prisma.appointment.upsert({
      where: { id: apptId },
      update: {},
      create: {
        id: apptId,
        salonId: ID.salon1,
        customerId: ID.customer,
        serviceId: svcId,
        scheduledAt: scheduledAt as Date,
        durationMinutes: 30,
        status: 'completed',
      },
    });
  }

  // Two reviews for those appointments (published + under_review)
  await prisma.review.upsert({
    where: { id: P5_IDS.review1 },
    update: {},
    create: {
      id: P5_IDS.review1,
      salonId: ID.salon1,
      customerId: ID.customer,
      appointmentId: P5_IDS.appt1,
      rating: 5,
      comment: 'Great haircut! Very professional staff.',
      status: 'published',
    },
  });

  await prisma.review.upsert({
    where: { id: P5_IDS.review2 },
    update: {},
    create: {
      id: P5_IDS.review2,
      salonId: ID.salon1,
      customerId: ID.customer,
      appointmentId: P5_IDS.appt2,
      rating: 2,
      comment: 'Waiting time was too long.',
      status: 'under_review',
    },
  });

  // Update salon1 denormalized rating
  await prisma.salon.update({
    where: { id: ID.salon1 },
    data: { averageRating: 3.5, reviewCount: 2 },
  });

  // One open complaint about salon1 from the customer
  await prisma.complaint.upsert({
    where: { id: P5_IDS.complaint1 },
    update: {},
    create: {
      id: P5_IDS.complaint1,
      reporterId: ID.customer,
      salonId: ID.salon1,
      appointmentId: P5_IDS.appt2,
      category: 'wait_time',
      body: 'I had to wait over 45 minutes past my appointment time. No updates were given.',
      status: 'open',
    },
  });

  // One mock payment record (paid) for the first appointment
  await prisma.payment.upsert({
    where: { id: P5_IDS.payment1 },
    update: {},
    create: {
      id: P5_IDS.payment1,
      customerId: ID.customer,
      salonId: ID.salon1,
      appointmentId: P5_IDS.appt1,
      amountCents: 20000,
      currency: 'INR',
      status: 'paid',
      provider: 'mock',
      providerRef: 'mock_ref_001',
    },
  });

  // === Operating hours ===
  // Delete existing hours for all seeded salons, then create fresh.
  const salonIds = salons.map((s) => s.id);
  await prisma.operatingHours.deleteMany({ where: { salonId: { in: salonIds } } });

  // Salon 1 — Mon-Sat 09:00-20:00
  await prisma.operatingHours.createMany({
    data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
      salonId: ID.salon1,
      weekday,
      openTime: '09:00',
      closeTime: '20:00',
    })),
  });

  // Salon 2 — All 7 days 10:00-21:00
  await prisma.operatingHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      salonId: ID.salon2,
      weekday,
      openTime: '10:00',
      closeTime: '21:00',
    })),
  });

  // Salon 3 — Tue-Sun 08:00-19:00 (Monday closed)
  await prisma.operatingHours.createMany({
    data: [0, 2, 3, 4, 5, 6].map((weekday) => ({
      salonId: ID.salon3,
      weekday,
      openTime: '08:00',
      closeTime: '19:00',
    })),
  });

  // Salon 4 — Mon-Sat 10:00-20:00 (Sunday closed)
  await prisma.operatingHours.createMany({
    data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
      salonId: ID.salon4,
      weekday,
      openTime: '10:00',
      closeTime: '20:00',
    })),
  });

  // Salon 5 — NO hours configured (openState will be 'unconfigured')

  console.log('Seed complete:');
  console.log('  Users: admin, owner, staff, newowner (no salon), owner2–5, customer');
  console.log('  Salons: 5 active salons in Raipur');
  console.log('  Services: 16 services (1 inactive) across 5 salons');
  console.log('  Hours: 4 salons with hours, 1 without (unconfigured)');
  console.log('  Phase 5: 2 appointments, 2 reviews, 1 complaint, 1 payment');
  console.log('Dev password for all seeded accounts: ' + DEV_PASSWORD);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
