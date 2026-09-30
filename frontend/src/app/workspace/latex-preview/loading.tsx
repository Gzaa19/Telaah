import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LatexPreviewSkeleton } from "@/components/features/skeletons/LatexPreviewSkeleton";

export default function LatexPreviewLoading() {
  return (
    <WorkspaceLayout>
      <LatexPreviewSkeleton />
    </WorkspaceLayout>
  );
}
