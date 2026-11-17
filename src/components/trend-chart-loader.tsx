"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/skeletons";

// Recharts is a heavy dependency; split it out of the /reports route chunk.
// `next/dynamic` only code-splits from a Client Component, hence this wrapper.
export const TrendChart = dynamic(
  () => import("./trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
