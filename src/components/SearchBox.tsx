import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SearchBoxProps {
  defaultValue?: string;
  autoFocus?: boolean;
  large?: boolean;
}

export default function SearchBox({
  defaultValue = "",
  autoFocus = false,
  large = false,
}: SearchBoxProps) {
  const [query, setQuery] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      className="w-full"
    >
      <div
        className={`
          relative overflow-hidden transition-all duration-300
          ${large ? "rounded-3xl" : "rounded-2xl"}
          ${isFocused ? "glass-accent" : "glass"}
        `}
      >
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 -z-10 rounded-3xl pointer-events-none"
          />
        )}

        <div className="flex items-center py-2 px-4">
          <Search
            size={large ? 20 : 18}
            className={`
              ml-3 transition-colors duration-200 flex-shrink-0
              ${isFocused ? "text-emerald-400" : "text-white/35"}
            `}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus={autoFocus}
            placeholder="مثلاً شادمهر، محسن یگانه یا The Weeknd"
            dir="auto"
            className={`
              flex-1 bg-transparent text-white placeholder-white/30 outline-none px-3
              ${large ? "py-3.5 text-lg" : "py-3 text-base"}
            `}
          />

          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="mx-4 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 flex-shrink-0"
            >
              <X size={16} />
            </motion.button>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-white/30">
        با{" "}
        <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
          /
        </kbd>{" "}
        سرچ رو فوکوس کن
      </p>
    </motion.form>
  );
}
