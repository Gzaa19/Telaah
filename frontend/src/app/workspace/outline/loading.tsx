import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { OutlinePageSkeleton } from "@/components/features/skeletons/OutlinePageSkeleton";

export default function OutlineLoading() {
  return (
    <WorkspaceLayout>
      <OutlinePageSkeleton />
    </WorkspaceLayout>
  );
}
