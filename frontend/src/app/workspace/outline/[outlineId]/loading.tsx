import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { OutlineCanvasSkeleton } from "@/components/features/skeletons/OutlineCanvasSkeleton";

export default function OutlineDetailLoading() {
  return (
    <WorkspaceLayout>
      <OutlineCanvasSkeleton />
    </WorkspaceLayout>
  );
}
