import React from 'react'

export default function ProjectModuleLoading() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse">
      {/* Skeleton Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-3 w-1/3">
          <div className="h-8 bg-surface-dim rounded-lg w-3/4"></div>
          <div className="h-4 bg-surface-dim rounded-lg w-full"></div>
        </div>
        <div className="h-10 w-32 bg-surface-dim rounded-lg"></div>
      </div>

      {/* Skeleton Content Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-surface-dim rounded-xl border border-border"></div>
        <div className="h-32 bg-surface-dim rounded-xl border border-border"></div>
        <div className="h-32 bg-surface-dim rounded-xl border border-border"></div>
      </div>

      <div className="h-96 bg-surface-dim rounded-xl border border-border w-full mt-4"></div>
    </div>
  )
}
