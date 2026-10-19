import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage.jsx'
import { ProjectorPage } from './pages/ProjectorPage.jsx'
import { SplitScreenTestPage } from './pages/SplitScreenTestPage.jsx'
import { MusicLibraryPage } from './pages/MusicLibraryPage.jsx'
import { RoundLibraryPage } from './pages/RoundLibraryPage.jsx'
import { TeamManagementPage } from './pages/TeamManagementPage.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/teams" element={<TeamManagementPage />} />
        <Route path="/rounds" element={<RoundLibraryPage />} />
        <Route path="/media" element={<MusicLibraryPage />} />
        <Route path="/projector" element={<ProjectorPage />} />
        <Route path="/split-test" element={<SplitScreenTestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
