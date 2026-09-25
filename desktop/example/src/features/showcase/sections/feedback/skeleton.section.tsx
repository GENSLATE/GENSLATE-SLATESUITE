import { Skeleton } from '@genslate/design-system';
import { Specimen } from '../../components/specimen.component';

export function SkeletonSection() {
  return (
    <Specimen
      title="Skeleton"
      description="Placeholders with a soft shimmer (still under reduced motion)."
      stageClassName="grid grid-cols-2 gap-8"
    >
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading profile"
        className="flex items-start gap-3"
      >
        <Skeleton shape="circle" className="size-10" />
        <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
          <Skeleton shape="text" className="w-1/3" />
          <Skeleton shape="text" className="w-5/6" />
          <Skeleton shape="text" className="w-2/3" />
        </div>
      </div>
      <div role="status" aria-busy="true" aria-label="Loading card" className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-control-md w-24" />
          <Skeleton className="h-control-md w-16" />
        </div>
      </div>
    </Specimen>
  );
}
