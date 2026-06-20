import { HashRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/lib/playerStore";
import Header from "@/components/Header";
import MiniPlayer from "@/components/MiniPlayer";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import PlayerPage from "@/pages/PlayerPage";

export default function App() {
  return (
    <HashRouter>
      <PlayerProvider>
        <div className="relative min-h-screen">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
          </Routes>
          <MiniPlayer />
        </div>
      </PlayerProvider>
    </HashRouter>
  );
}
