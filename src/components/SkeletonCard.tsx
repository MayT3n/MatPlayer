import { motion } from "framer-motion";

export default function SkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-3xl p-3"
    >
      <div className="flex items-center gap-4">
        {/* Thumbnail skeleton */}
        <div className="skeleton h-16 w-16 flex-shrink-0 rounded-2xl" />

        {/* Text skeletons */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="skeleton h-4 w-3/4 rounded-lg" />
          <div className="skeleton h-3 w-1/2 rounded-lg" />
        </div>

        {/* Button skeleton */}
        <div className="skeleton h-9 w-9 rounded-full" />
      </div>
    </motion.div>
  );
}
