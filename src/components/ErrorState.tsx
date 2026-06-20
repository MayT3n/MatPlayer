import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10">
        <AlertCircle size={32} className="text-red-400/70" />
      </div>

      <h3 className="text-lg font-medium text-white/80">
        یه مشکلی پیش اومد
      </h3>

      <p className="mt-2 max-w-xs text-sm text-white/40">
        {message || "لطفاً اینترنتت رو چک کن و دوباره امتحان کن."}
      </p>

      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full btn-glass px-5 py-2.5 text-sm text-white/70"
        >
          <RefreshCw size={14} />
          تلاش دوباره
        </motion.button>
      )}
    </motion.div>
  );
}
