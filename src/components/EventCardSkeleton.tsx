export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-[16/9] bg-gray-200">
        {/* Category Badge Skeleton */}
        <div className="absolute top-3 left-3">
          <div className="h-6 w-20 bg-gray-300 rounded"></div>
        </div>

        {/* Heart Icon Skeleton */}
        <div className="absolute top-3 right-3">
          <div className="w-9 h-9 rounded-full bg-gray-300"></div>
        </div>

        {/* Type Badge Skeleton */}
        <div className="absolute bottom-3 right-3">
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Date Skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-12 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>

        {/* Title Skeleton */}
        <div className="mb-2">
          <div className="h-5 w-full bg-gray-200 rounded mb-2"></div>
          <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
        </div>

        {/* Location Skeleton */}
        <div className="flex items-start gap-2 mb-4">
          <div className="w-4 h-4 bg-gray-200 rounded mt-0.5"></div>
          <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200"></div>
            <div className="h-3 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
