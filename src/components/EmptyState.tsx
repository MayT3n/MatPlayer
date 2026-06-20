import { motion } from "framer-motion";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  query?: string;
}

export default function EmptyState({ query }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl glass">
        <SearchX size={32} className="text-white/30" />
      </div>

      <h3 className="text-lg font-medium text-white/80">
        نتیجه‌ای پیدا نشد
      </h3>

      {query && (
        <p className="mt-2 max-w-xs text-sm text-white/40">
          برای «{query}» چیزی پیدا نکردیم. یه اسم دیگه رو امتحان کن.
        </p>
      )}
    </motion.div>
  );
}
