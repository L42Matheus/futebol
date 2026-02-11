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
import Login from './pages/Login'
import Register from './pages/Register'
import ChooseRole from './pages/ChooseRole'
import PrivateRoute from './components/PrivateRoute'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/perfil" element={<ChooseRole />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="novo" element={<NovoRacha />} />
            <Route path="racha/:rachaId" element={<RachaDetail />} />
            <Route path="racha/:rachaId/times" element={<Times />} />
            <Route path="racha/:rachaId/jogos" element={<Jogos />} />
            <Route path="racha/:rachaId/novo-jogo" element={<NovoJogo />} />
            <Route path="racha/:rachaId/jogo/:jogoId" element={<JogoDetail />} />
            <Route path="racha/:rachaId/atletas" element={<Atletas />} />
            <Route path="racha/:rachaId/financeiro" element={<Financeiro />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
