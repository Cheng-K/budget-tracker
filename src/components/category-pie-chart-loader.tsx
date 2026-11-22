"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/skeletons";

// Recharts is a heavy dependency; split it out of the /reports route chunk.
// `next/dynamic` only code-splits from a Client Component, hence this wrapper.
export const CategoryPieChart = dynamic(
  () => import("./category-pie-chart").then((m) => m.CategoryPieChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
