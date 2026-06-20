import { motion } from "framer-motion";
import { Send, ArrowUpLeft } from "lucide-react";

export default function TelegramCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className="glass-subtle rounded-3xl p-6"
    >
      <div className="flex items-start gap-5">
        {/* Icon */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-2xl bg-sky-400/30 blur-xl" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/80 to-blue-500/80">
            <Send size={20} className="text-white" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-base font-medium text-white/90">
            (چنل تلگرام) 🎵
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/40">
            برای آهنگ‌های جدید و آپدیت‌های بعدی، به چنل تلگراممون سر بزن.
          </p>

          <motion.a
            href="https://t.me/MatZamEdition"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-5 py-2 text-sm font-medium text-sky-400 transition-colors hover:bg-sky-500/15"
          >
            <Send size={14} />
            عضویت در کانال
            <ArrowUpLeft size={14} className="rotate-90 opacity-60" />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}
