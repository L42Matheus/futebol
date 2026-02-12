import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import RachaDetail from './pages/RachaDetail'
import JogoDetail from './pages/JogoDetail'
import Atletas from './pages/Atletas'
import Financeiro from './pages/Financeiro'
import NovoRacha from './pages/NovoRacha'
import NovoJogo from './pages/NovoJogo'
import Jogos from './pages/Jogos'
import Times from './pages/Times'
import TeamLineup from './pages/TeamLineup'
import AtletaProfile from './pages/AtletaProfile'
import Artilharia from './pages/Artilharia'
import Login from './pages/Login'
import Register from './pages/Register'
import ChooseRole from './pages/ChooseRole'
import PrivateRoute from './components/PrivateRoute'
import NoRacha from './pages/NoRacha'
import AthleteSelfProfile from './pages/AthleteSelfProfile'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/perfil" element={<ChooseRole />} />
        <Route path="/perfil-basico" element={<NoRacha />} />
        <Route path="/perfil-atleta" element={<AthleteSelfProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="novo" element={<NovoRacha />} />
            <Route path="racha/:rachaId" element={<RachaDetail />} />
            <Route path="racha/:rachaId/times" element={<Times />} />
            <Route path="racha/:rachaId/escalacao" element={<TeamLineup />} />
            <Route path="racha/:rachaId/jogos" element={<Jogos />} />
            <Route path="racha/:rachaId/novo-jogo" element={<NovoJogo />} />
            <Route path="racha/:rachaId/jogo/:jogoId" element={<JogoDetail />} />
            <Route path="racha/:rachaId/atletas" element={<Atletas />} />
            <Route path="racha/:rachaId/atleta/:atletaId" element={<AtletaProfile />} />
            <Route path="racha/:rachaId/financeiro" element={<Financeiro />} />
            <Route path="artilharia" element={<Artilharia />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
