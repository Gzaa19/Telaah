import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { DriveBrowserSkeleton } from "@/components/features/skeletons/DriveBrowserSkeleton";

export default function DriveBrowserLoading() {
  return (
    <WorkspaceLayout>
      <DriveBrowserSkeleton />
    </WorkspaceLayout>
  );
}
