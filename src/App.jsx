import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameConfigurationPage } from './pages/admin/GameConfigurationPage.jsx'
import { StageConfigurationPage } from './pages/admin/StageConfigurationPage.jsx'
import { TournamentInstanceConfigPage } from './pages/admin/TournamentInstanceConfigPage.jsx'
import { PlayingScreenPage } from './pages/admin/PlayingScreenPage.jsx'
import { ProjectorPage } from './pages/ProjectorPage.jsx'
import { SplitScreenTestPage } from './pages/SplitScreenTestPage.jsx'
import { MusicLibraryPage } from './pages/MusicLibraryPage.jsx'
import { RoundLibraryPage } from './pages/RoundLibraryPage.jsx'
import { BuzzerMobilePage } from './pages/BuzzerMobilePage.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/config" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/config" replace />} />
        <Route path="/admin/config" element={<GameConfigurationPage />} />
        <Route path="/admin/stage/:profileId" element={<StageConfigurationPage />} />
        <Route path="/admin/tournament/:instanceId" element={<TournamentInstanceConfigPage />} />
        <Route path="/admin/play" element={<PlayingScreenPage />} />
        <Route path="/teams" element={<Navigate to="/admin/config" replace />} />
        <Route path="/rounds" element={<RoundLibraryPage />} />
        <Route path="/media" element={<MusicLibraryPage />} />
        <Route path="/projector" element={<ProjectorPage />} />
        <Route path="/split-test" element={<SplitScreenTestPage />} />
        <Route path="/buzzer-mobile" element={<BuzzerMobilePage />} />
        <Route path="*" element={<Navigate to="/admin/config" replace />} />
      </Routes>
    </HashRouter>
  )
}
