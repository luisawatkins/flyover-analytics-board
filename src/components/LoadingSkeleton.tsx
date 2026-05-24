type LoadingSkeletonProps = {
  className?: string;
};

export const LoadingSkeleton = ({ className = "value-skeleton" }: LoadingSkeletonProps) => (
  <div className={className} aria-hidden="true" />
);
