import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Music2, Video, ExternalLink, Copy, Check } from "lucide-react";

interface DownloadButtonProps {
  videoId?: string;
  title?: string;
  compact?: boolean;
}

export default function DownloadButton({ videoId, title, compact }: DownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!videoId) return null;

  const ytUrl = `https://youtu.be/${videoId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(ytUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const services = [
    {
      label: "دانلود MP3 / ویدیو",
      hint: "Cobalt — متن‌باز، بدون تبلیغ",
      icon: <Music2 size={16} />,
      href: `https://cobalt.tools/`,
    },
    {
      label: "دانلود سریع",
      hint: "SaveFrom",
      icon: <Video size={16} />,
      href: `https://ssyoutube.com/watch?v=${videoId}`,
    },
  ];

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "btn-glass flex h-10 w-10 items-center justify-center rounded-full text-white/70"
            : "btn-glass flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium text-white/70"
        }
        title="دانلود آهنگ"
      >
        <Download size={compact ? 18 : 14} />
        {!compact && "دانلود"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-xl"
            >
              <div className="glass-strong rounded-t-[2rem] p-5 pb-7">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                    <Download size={18} className="text-emerald-400" />
                    دانلود آهنگ
                  </h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="btn-glass flex h-8 w-8 items-center justify-center rounded-full text-white/60"
                  >
                    <X size={16} />
                  </button>
                </div>

                {title && (
                  <p className="mb-3 truncate text-sm text-white/55" dir="auto">
                    {title}
                  </p>
                )}

                <div className="space-y-2">
                  {services.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                        {s.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-white/90">{s.label}</span>
                        <span className="block text-[11px] text-white/40 font-en">{s.hint}</span>
                      </span>
                      <ExternalLink size={15} className="text-white/30" />
                    </a>
                  ))}

                  <button
                    onClick={copyLink}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70">
                      {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                    </span>
                    <span className="flex-1 text-right">
                      <span className="block text-sm font-medium text-white/90">
                        {copied ? "کپی شد!" : "کپی لینک یوتیوب"}
                      </span>
                      <span className="block truncate text-[11px] text-white/40 font-en" dir="ltr">
                        {ytUrl}
                      </span>
                    </span>
                  </button>
                </div>

                <p className="mt-4 text-center text-[11px] leading-relaxed text-white/30">
                  دانلود از طریق سرویس رایگانِ بیرونی انجام می‌شه (به‌خاطر محدودیت‌های یوتیوب).
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
