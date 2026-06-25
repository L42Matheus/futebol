import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { rachasApi } from '../services/api'

const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'

export default function JogosHub() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    async function go() {
      try {
        const res = await rachasApi.list()
        const rachas = res.data || []
        const savedRachaId = localStorage.getItem(SELECTED_RACHA_KEY)
        const selectedRacha =
          rachas.find((racha) => String(racha.id) === savedRachaId) || rachas[0]

        if (selectedRacha) {
          localStorage.setItem(SELECTED_RACHA_KEY, String(selectedRacha.id))
          navigate(`/racha/${selectedRacha.id}/jogos`, { replace: true })
        } else {
          setEmpty(true)
        }
      } catch (e) {
        console.error(e)
        setError('Não foi possível carregar seus rachas agora.')
      }
    }
    go()
  }, [navigate])

  if (error || empty) {
    return (
      <div className="card text-center py-10 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">
          {empty ? 'Nenhum racha encontrado' : 'Ops, agenda indisponível'}
        </h1>
        <p className="text-gray-400 mb-4">
          {empty
            ? 'Crie ou aceite um convite de racha para ver os jogos.'
            : error}
        </p>
        <Link to="/app" className="btn-primary inline-flex">
          Voltar para início
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
  )
}
