import { Routes, Route, Navigate } from 'react-router-dom'
import StartScreen from './screens/StartScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import RoundEndScreen from './screens/RoundEndScreen'
import GameOverScreen from './screens/GameOverScreen'
import Toaster from './components/Toast'
import ConnectionBanner from './components/ConnectionBanner'
import { useSocket } from './hooks/useSocket'

export default function App() {
  useSocket()

  return (
    <>
      <ConnectionBanner />
      <Toaster />
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/round-end" element={<RoundEndScreen />} />
        <Route path="/game-over" element={<GameOverScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
