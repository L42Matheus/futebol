import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rachasApi } from '../services/api'

const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'

export default function JogosHub() {
  const navigate = useNavigate()

  useEffect(() => {
    async function go() {
      try {
        const res = await rachasApi.list()
        const rachas = res.data || []
        const savedRachaId = localStorage.getItem(SELECTED_RACHA_KEY)
        const selectedRacha =
          rachas.find((racha) => String(racha.id) === savedRachaId) || rachas[0]

        if (selectedRacha) {
          navigate(`/racha/${selectedRacha.id}/jogos`, { replace: true })
        }
      } catch (e) {
        console.error(e)
      }
    }
    go()
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
  )
}
