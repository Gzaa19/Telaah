import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { LibraryPageSkeleton } from "@/components/features/skeletons/LibraryPageSkeleton";

export default function LibraryLoading() {
  return (
    <WorkspaceLayout>
      <LibraryPageSkeleton />
    </WorkspaceLayout>
  );
}
