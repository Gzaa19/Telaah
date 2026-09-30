import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { PaperPageSkeleton } from "@/components/features/skeletons/PaperPageSkeleton";

export default function PaperLoading() {
  return (
    <WorkspaceLayout>
      <PaperPageSkeleton />
    </WorkspaceLayout>
  );
}
