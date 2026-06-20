import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Music4, Quote } from "lucide-react";

export interface LyricLine {
  time: number;
  text: string;
  fa?: boolean;
}

interface LyricsViewProps {
  lyrics: LyricLine[];
  currentTime: number;
  synced?: boolean;
  isLoading?: boolean;
  title?: string;
  artist?: string;
  onSeek?: (t: number) => void;
  variant?: "panel" | "full";
  timingOffset?: number;
}

const PERSIAN_REGEX = /[\u0600-\u06FF]/;
const RTL_REGEX = /[\u0590-\u08FF]/;

type PreparedLyricLine = LyricLine & {
  key: string;
  numericTime: number;
  isTimed: boolean;
  isRTL: boolean;
  isPersian: boolean;
};

const SPRING_CONFIG = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export default function LyricsView({
  lyrics,
  currentTime,
  synced = true,
  isLoading = false,
  title,
  artist,
  onSeek,
  variant = "panel",
  timingOffset = 0.2,
}: LyricsViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const preparedLyrics = useMemo<PreparedLyricLine[]>(() => {
    if (!Array.isArray(lyrics)) return [];

    return lyrics.map((line, i) => {
      const numericTime = Number(line.time);
      const isTimed = Number.isFinite(numericTime) && numericTime >= 0;
      const text = typeof line.text === "string" ? line.text : "";
      
      const isPersian = typeof line.fa === "boolean" 
        ? line.fa 
        : PERSIAN_REGEX.test(text);
      
      const isRTL = isPersian || RTL_REGEX.test(text);

      return {
        ...line,
        text,
        numericTime: isTimed ? numericTime : -1,
        isTimed,
        isRTL,
        isPersian,
        key: `${i}-${isTimed ? numericTime.toFixed(3) : "plain"}-${text.slice(0, 20)}`,
      };
    });
  }, [lyrics]);

  const timedCount = useMemo(() => {
    return preparedLyrics.reduce((count, line) => count + (line.isTimed ? 1 : 0), 0);
  }, [preparedLyrics]);

  const hasTiming = synced && timedCount >= 2;

  const isMajorityPersian = useMemo(() => {
    if (!preparedLyrics.length) return false;
    const persianCount = preparedLyrics.filter(l => l.isPersian).length;
    return persianCount > preparedLyrics.length / 3;
  }, [preparedLyrics]);

  useEffect(() => {
    if (!hasTiming) {
      setActiveIndex(-1);
      return;
    }

    const adjustedTime = currentTime + timingOffset;
    let left = 0;
    let right = preparedLyrics.length - 1;
    let bestIndex = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const line = preparedLyrics[mid];
      
      if (!line.isTimed) {
        left++;
        continue;
      }

      if (line.numericTime <= adjustedTime) {
        bestIndex = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (bestIndex !== activeIndex) {
      setActiveIndex(bestIndex);
    }
  }, [currentTime, preparedLyrics, hasTiming, timingOffset, activeIndex]);

  // Scroll to center - فقط وقتی اکتیو ایندکس عوض میشه
  useEffect(() => {
    if (!hasTiming || activeIndex < 0 || !containerRef.current) return;

    const activeElement = itemRefs.current[activeIndex];
    if (!activeElement) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;
    const elementTop = activeElement.offsetTop;
    const elementHeight = activeElement.clientHeight;
    
    // دقیقاً وسط صفحه
    const targetScroll = elementTop - (containerHeight / 2) + (elementHeight / 2);
    
    container.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  }, [activeIndex, hasTiming]);

  const maxH = variant === "full" ? "100%" : "360px";

  if (isLoading) {
    return (
      <div className="lyrics-glass relative overflow-hidden rounded-3xl" dir={isMajorityPersian ? "rtl" : "ltr"}>
        <div className="flex items-center justify-center py-20">
          <motion.div 
            className="flex items-center gap-3 text-white/40"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Music4 size={20} className="text-emerald-400" />
            <span className="text-sm font-medium tracking-wide">در حال یافتن متن آهنگ…</span>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!preparedLyrics.length) {
    return (
      <div className="lyrics-glass relative overflow-hidden rounded-3xl p-8" dir={isMajorityPersian ? "rtl" : "ltr"}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <Quote size={24} className="text-white/30" />
          </div>
          <p className="text-base text-white/50 font-medium">متنی برای این آهنگ پیدا نشد</p>
          {title && (
            <p className="mt-2 text-xs text-white/30 font-medium tracking-wide">
              {title}
              {artist ? ` · ${artist}` : ""}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="lyrics-glass relative overflow-x-hidden overflow-y-auto rounded-3xl"
      dir={isMajorityPersian ? "rtl" : "ltr"}
      style={{ 
        maxHeight: maxH, 
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* 
        Padding بزرگ بالا و پایین برای اینکه خط فعال بتونه وسط قرار بگیره
        حتی اگه اولین یا آخرین خط باشه
      */}
      <div 
        className="relative px-8 space-y-6"
        style={{ 
          paddingTop: '50vh',  // نصف ارتفاع کانتینر
          paddingBottom: '50vh' // نصف ارتفاع کانتینر
        }}
      >
        {preparedLyrics.map((line, i) => {
          const isActive = hasTiming && i === activeIndex;
          const isPast = hasTiming && line.isTimed && i < activeIndex;
          
          return (
            <motion.div
              key={line.key}
              ref={el => { itemRefs.current[i] = el; }}
              initial={false}
              animate={{
                opacity: isActive ? 1 : isPast ? 0.3 : 0.25,
                scale: isActive ? 1.05 : 1,
              }}
              transition={SPRING_CONFIG}
              className="relative w-full"
              style={{
                textAlign: line.isRTL ? "right" : "left",
                direction: line.isRTL ? "rtl" : "ltr",
              }}
            >
              <motion.button
                type="button"
                disabled={!hasTiming || !line.isTimed || !onSeek}
                onClick={() => line.isTimed && onSeek?.(line.numericTime)}
                whileTap={{ scale: 0.98 }}
                className={[
                  "block w-full rounded-2xl px-6 py-4",
                  "transition-all duration-300",
                  line.isRTL ? "text-right font-[system-ui]" : "text-left font-en",
                  isActive 
                    ? "text-white font-bold text-2xl md:text-3xl leading-relaxed"
                    : "text-white/60 text-lg md:text-xl font-medium leading-relaxed",
                  line.isTimed && onSeek ? "cursor-pointer hover:bg-white/[0.03] hover:text-white/80" : "cursor-default",
                ].join(" ")}
                dir={line.isRTL ? "rtl" : "ltr"}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute inset-0 -z-10 rounded-2xl bg-white/5 blur-xl"
                    transition={SPRING_CONFIG}
                  />
                )}
                
                <span 
                  className="relative z-10 block"
                  style={{ unicodeBidi: "plaintext" }}
                >
                  {line.text || "\u00A0"}
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}