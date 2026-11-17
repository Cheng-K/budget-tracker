import { StatsRowSkeleton, ListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <StatsRowSkeleton />
      <ListSkeleton rows={3} />
      <ListSkeleton rows={5} />
    </div>
  );
}
