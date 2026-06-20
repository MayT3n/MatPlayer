import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Music2, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isSearch = location.pathname === "/search";
  const isPlayer = location.pathname.startsWith("/player");

  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 80);
  });

  // The full player screen is immersive — no global header there
  if (isPlayer) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className={`
        sticky top-0 z-50 transition-all duration-300
        ${scrolled ? "glass-strong py-2" : "glass-subtle py-3"}
      `}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-2.5 transition-transform active:scale-95 flex-shrink-0"
        >
          <motion.div
            animate={{
              scale: scrolled ? 0.8 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-xl bg-emerald-400/40 blur-lg transition-opacity" 
              style={{ opacity: scrolled ? 0.3 : 0.5 }}
            />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/20">
              <Music2 size={16} className="text-zinc-900" strokeWidth={2.5} />
            </div>
          </motion.div>

          <motion.span
            animate={{
              fontSize: scrolled ? "0.9rem" : "1rem",
              opacity: scrolled ? 0 : 1,
              width: scrolled ? 0 : "auto",
              marginLeft: scrolled ? 0 : undefined,
            }}
            transition={{ duration: 0.25 }}
            className="font-bold tracking-tight text-white overflow-hidden whitespace-nowrap"
          >
            Mat Player
          </motion.span>
        </button>

        {/* Compact search bar when scrolled */}
        {scrolled && !isSearch && (
          <motion.form
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSearchSubmit}
            className="flex-1 min-w-0"
          >
            <div className="relative flex items-center rounded-full bg-white/5 border border-white/5 px-4 py-2 transition-colors focus-within:border-emerald-500/30 focus-within:bg-white/8">
              <Search size={15} className="text-white/30 flex-shrink-0 ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو..."
                dir="auto"
                className="w-full bg-transparent px-3 text-sm text-white placeholder-white/30 outline-none"
              />
            </div>
          </motion.form>
        )}

        {/* Spacer */}
        {!scrolled && <div className="flex-1" />}

        {/* Back / Home button */}
        {!isHome && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => navigate("/")}
            className="btn-glass rounded-full px-4 py-2 text-xs text-white/70 flex-shrink-0"
          >
            صفحه اصلی
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}
