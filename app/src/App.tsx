import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CreateBracketPage } from './pages/CreateBracketPage'
import { EditScoresPage } from './pages/EditScoresPage'
import { InputScoreConfirmPage } from './pages/InputScoreConfirmPage'
import { InputScoreResultPage } from './pages/InputScoreResultPage'
import { InputScoreSelectPage } from './pages/InputScoreSelectPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { RecommendedMatchesPage } from './pages/RecommendedMatchesPage'
import { SaveLeaguePage } from './pages/SaveLeaguePage'
import { HomePage } from './pages/HomePage'
import { EditLeaguePage } from './pages/EditLeaguePage'
import { ChangeLeaguePage } from './pages/ChangeLeaguePage'
import { LoginPage } from './pages/LoginPage'
import { ShareLeaguePage } from './pages/ShareLeaguePage'
import { JoinLeaguePage } from './pages/JoinLeaguePage'

function Nav() {
  const location = useLocation()

  const links = [
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/create-bracket', label: 'Add Players' },
    { to: '/share-league', label: 'Share League' },
  ]

  return (
    <nav className="top-nav">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className={location.pathname === link.to ? 'active' : ''}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    <div className="app-shell court-bg">
      <header className="app-header">
        <h1>PickleParty</h1>
        <p>Keep track of your casual pickleball league with ease.</p>
      </header>
      <Nav />
      <main className="page-wrap">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create-bracket" element={<CreateBracketPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/recommended" element={<RecommendedMatchesPage />} />
          <Route path="/input-score/select" element={<InputScoreSelectPage />} />
          <Route path="/input-score/result" element={<InputScoreResultPage />} />
          <Route path="/input-score/confirm" element={<InputScoreConfirmPage />} />
          <Route path="/edit-scores" element={<EditScoresPage />} />
          <Route path="/save" element={<SaveLeaguePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/edit-league" element={<EditLeaguePage />} />
          <Route path="/share-league" element={<ShareLeaguePage />} />
          <Route path="/change-league" element={<ChangeLeaguePage />} />
          <Route path="/join/:leagueId" element={<JoinLeaguePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
