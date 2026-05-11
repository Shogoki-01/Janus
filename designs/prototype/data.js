// Janus — mock data
// One realistic scenario across the whole prototype so screens reference
// each other coherently. CA address triggers the fee-cap jurisdiction warning.

const DEMO = {
  property: {
    id: 'P-1042',
    name: 'The Larkin',
    unit: '3B',
    address: '247 Larkin Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    rent: 3250,
    deposit: 3250,
    fee: 75,
    bed: 2, bath: 1, sqft: 920,
    move_in: 'Jun 1, 2026',
    landlord: 'Larkin Holdings LLC',
    landlord_short: 'Larkin Holdings',
    listed: '6 days ago',
    photos: 4,
  },

  primary: {
    id: 'A-2841',
    name: 'Maya Okonkwo',
    first: 'Maya',
    email: 'maya.okonkwo@gmail.com',
    phone: '(415) 555-0142',
    employer: 'Open Field Studio',
    title: 'Senior Product Designer',
    income_monthly: 8200,
    income_annual: 98400,
    credit: 738,
    has_voucher: false,
    progress: 'completed',
  },

  coapplicants: [
    {
      id: 'A-2842',
      name: 'Jordan Reyes',
      first: 'Jordan',
      email: 'jordan.r@hey.com',
      relationship: 'Partner',
      progress: 'in_progress',
      progress_pct: 0.6,
      step: 'Income verification',
      invited: '2 days ago',
      credit: null,
      income_monthly: null,
    },
  ],

  // Application detail — for reviewer view
  application: {
    id: 'AP-10428',
    submitted: 'May 9, 2026',
    submitted_relative: '2 days ago',
    status: 'pending_decision',
    recommendation: 'conditional', // approve | conditional | deny
    applicants: [
      {
        name: 'Maya Okonkwo',
        role: 'Primary',
        age: 29,
        credit: 738,
        credit_band: 'Good',
        income_monthly: 8200,
        income_verified: true,
        income_source: 'Plaid · Chase 4892',
        employer: 'Open Field Studio',
        employer_verified: true,
        criminal: { count: 0, flags: [] },
        eviction: { count: 0, flags: [] },
        id_verified: true,
        prior_residences: 2,
        bankruptcies: 0,
      },
      {
        name: 'Jordan Reyes',
        role: 'Co-applicant',
        age: 31,
        credit: 612,
        credit_band: 'Fair',
        income_monthly: 4400,
        income_verified: true,
        income_source: 'Document — 2 paystubs',
        employer: 'Self-employed · freelance writer',
        employer_verified: false,
        criminal: { count: 0, flags: [] },
        eviction: { count: 1, flags: ['Filed Oct 2023, dismissed Jan 2024'] },
        id_verified: true,
        prior_residences: 3,
        bankruptcies: 0,
      },
    ],
    references: [
      { name: 'Renee Acosta', role: 'Current Landlord', status: 'responded', rating: 'positive', response_time: '14 hrs', note: 'On time every month, leaving in good standing. Would rent to again.' },
      { name: 'David Park', role: 'Employer · Open Field Studio', status: 'responded', rating: 'positive', response_time: '2 days', note: 'Confirmed employment and salary. Has been a senior designer here for 2 years.' },
      { name: 'M. Chen', role: 'Prior Landlord (2021–2024)', status: 'pending', rating: null, response_time: null },
    ],
    documents: [
      { kind: 'paystub', label: '2025-04 Paystub.pdf', size: '240 KB', for: 'Maya', flag: null },
      { kind: 'paystub', label: '2025-03 Paystub.pdf', size: '236 KB', for: 'Maya', flag: null },
      { kind: 'bank', label: 'Chase statement — Apr 2025.pdf', size: '1.1 MB', for: 'Maya', flag: null },
      { kind: 'paystub', label: 'Freelance summary Q1.pdf', size: '180 KB', for: 'Jordan', flag: 'Self-reported; not from payroll provider' },
      { kind: 'bank', label: 'Ally statement — Apr 2025.pdf', size: '720 KB', for: 'Jordan', flag: null },
    ],
    flags: [
      { tone: 'warn', label: 'Combined income 3.88× rent (policy ≥ 3.0×)', detail: 'Meets threshold', value: 'ok' },
      { tone: 'warn', label: 'Co-applicant credit 612 (policy ≥ 650)', detail: 'Below threshold by 38', value: 'below' },
      { tone: 'warn', label: 'Eviction filing 2023, dismissed', detail: 'Co-applicant · resolved', value: 'noted' },
      { tone: 'ok', label: 'Both IDs verified · Persona', detail: '', value: 'ok' },
      { tone: 'ok', label: 'No criminal records', detail: '', value: 'ok' },
    ],
  },

  // Queue list — applications across multiple properties
  queue: [
    {
      id: 'AP-10428', applicant: 'Maya Okonkwo', coapplicants: 1,
      property: 'The Larkin · 3B', submitted: '2d ago',
      credit: 738, income_x: 3.88, recommendation: 'conditional',
      status: 'pending_decision',
    },
    {
      id: 'AP-10427', applicant: 'Daniel Voss', coapplicants: 0,
      property: 'Sunset Row · 12', submitted: '2d ago',
      credit: 791, income_x: 4.2, recommendation: 'approve',
      status: 'pending_decision',
    },
    {
      id: 'AP-10426', applicant: 'Priya Shah', coapplicants: 1,
      property: 'The Larkin · 5A', submitted: '3d ago',
      credit: 702, income_x: 3.1, recommendation: 'approve',
      status: 'pending_decision', voucher: true,
    },
    {
      id: 'AP-10425', applicant: 'Lila Hartman', coapplicants: 0,
      property: 'Marina House · 4', submitted: '3d ago',
      credit: 540, income_x: 2.4, recommendation: 'deny',
      status: 'pending_decision',
    },
    {
      id: 'AP-10424', applicant: 'Marcus Greene', coapplicants: 0,
      property: 'Sunset Row · 8', submitted: '4d ago',
      credit: 681, income_x: 3.4, recommendation: 'approve',
      status: 'approved',
    },
    {
      id: 'AP-10423', applicant: 'Emi Tanaka', coapplicants: 1,
      property: 'The Larkin · 2C', submitted: '5d ago',
      credit: 758, income_x: 4.6, recommendation: 'approve',
      status: 'approved',
    },
    {
      id: 'AP-10422', applicant: 'Felix Brennan', coapplicants: 0,
      property: 'Marina House · 1', submitted: '5d ago',
      credit: 612, income_x: 2.8, recommendation: 'conditional',
      status: 'conditional',
    },
    {
      id: 'AP-10421', applicant: 'Ngozi Eze', coapplicants: 0,
      property: 'Sunset Row · 14', submitted: '6d ago',
      credit: 720, income_x: 3.5, recommendation: 'approve',
      status: 'approved',
    },
    {
      id: 'AP-10420', applicant: 'Wren Avila', coapplicants: 1,
      property: 'The Larkin · 7B', submitted: '7d ago',
      credit: 588, income_x: 2.1, recommendation: 'deny',
      status: 'denied',
    },
    {
      id: 'AP-10419', applicant: 'Sam Patel', coapplicants: 0,
      property: 'Marina House · 6', submitted: '8d ago',
      credit: 0, income_x: 0, recommendation: 'pending',
      status: 'incomplete',
    },
  ],
};

window.DEMO = DEMO;
