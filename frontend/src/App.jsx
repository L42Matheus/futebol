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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="novo" element={<NovoRacha />} />
          <Route path="racha/:rachaId" element={<RachaDetail />} />
          <Route path="racha/:rachaId/jogos" element={<Jogos />} />
          <Route path="racha/:rachaId/novo-jogo" element={<NovoJogo />} />
          <Route path="racha/:rachaId/jogo/:jogoId" element={<JogoDetail />} />
          <Route path="racha/:rachaId/atletas" element={<Atletas />} />
          <Route path="racha/:rachaId/financeiro" element={<Financeiro />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
