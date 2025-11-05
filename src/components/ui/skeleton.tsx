"use client";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/20 dark:bg-gray-700 ${className}`}
      aria-hidden="true"
    />
  );
}