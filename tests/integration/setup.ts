import { vi } from "vitest";

// Server actions call Next runtime APIs that don't exist under Vitest.
// Mock only those seams; everything below (validation, queries, Prisma)
// runs for real against Postgres.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/require-user", () => ({
  requireUser: vi.fn(),
  requireUserNoGate: vi.fn(),
  getUser: vi.fn(),
}));
