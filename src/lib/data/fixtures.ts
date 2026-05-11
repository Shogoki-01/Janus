// Pre-DB fixtures. Replaced with Prisma queries once Supabase is provisioned.
//
// Shapes mirror prisma/schema.prisma so the swap is mechanical (rename
// `getPropertyBySlug` to a Prisma `db.property.findUnique`, drop the in-memory
// map). Display-only fields not yet in the schema (name, bed/bath/sqft,
// move-in, listed, landlord) are flagged as DISPLAY_TODO — promote them to
// real Property columns when wiring the real DB.

export type PropertyFixture = {
  id: string;
  slug: string;
  // Address
  addressLine1: string;
  addressLine2: string | null; // doubles as "unit" for display
  city: string;
  state: string;
  postalCode: string;
  jurisdiction: string; // ISO-style; see lib/jurisdictions.ts
  // Terms (cents)
  rentCents: number;
  depositCents: number;
  bedrooms: number;
  // DISPLAY_TODO — promote to Property columns later
  name: string;
  bathrooms: number;
  squareFeet: number;
  moveInDate: string; // ISO; rendered as "Jun 1, 2026" in UI
  listedRelative: string; // e.g. "6 days ago"
  landlordName: string;
  acceptingApplications: boolean;
};

export type ApplicationConfigFixture = {
  organizationId: string;
  platformFeeCents: number;
  minCreditScore: number;
  incomeMultiplier: number;
  maxDepositMonths: number;
};

// ────────────────────────── Fixtures ──────────────────────────

const PROPERTIES: PropertyFixture[] = [
  {
    id: "P-1042",
    slug: "the-larkin-3b",
    addressLine1: "247 Larkin Street",
    addressLine2: "Unit 3B",
    city: "San Francisco",
    state: "CA",
    postalCode: "94102",
    jurisdiction: "US-CA-SF",
    rentCents: 325_000,
    depositCents: 325_000,
    bedrooms: 2,
    name: "The Larkin",
    bathrooms: 1,
    squareFeet: 920,
    moveInDate: "2026-06-01",
    listedRelative: "6 days ago",
    landlordName: "Larkin Holdings LLC",
    acceptingApplications: true,
  },
];

const APPLICATION_CONFIG: ApplicationConfigFixture = {
  organizationId: "ORG-001",
  platformFeeCents: 3000, // $30 — per build-spec MVP default
  minCreditScore: 600,
  incomeMultiplier: 3.0,
  maxDepositMonths: 1, // SF/CA AB 12 — single-month cap means double-deposit auto-recommend is OFF
};

// Estimated TransUnion SmartMove fee. Copy-only; we don't charge this.
export const SMARTMOVE_FEE_DOLLARS = 40;

// ────────────────────────── Queries ──────────────────────────

/** Async to mirror the future Prisma `findUnique` shape. */
export async function getPropertyBySlug(slug: string): Promise<PropertyFixture | null> {
  return PROPERTIES.find((p) => p.slug === slug) ?? null;
}

export async function getApplicationConfig(): Promise<ApplicationConfigFixture> {
  return APPLICATION_CONFIG;
}
