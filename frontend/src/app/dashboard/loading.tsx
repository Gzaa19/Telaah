import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { DashboardPageSkeleton } from "@/components/features/skeletons/DashboardPageSkeleton";

export default function DashboardLoading() {
  return (
    <WorkspaceLayout>
      <DashboardPageSkeleton />
    </WorkspaceLayout>
  );
}
