import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rachasApi } from '../services/api'

export default function FinanceiroHub() {
  const navigate = useNavigate()

  useEffect(() => {
    async function go() {
      try {
        const res = await rachasApi.list()
        const first = res.data?.[0]
        if (first) {
          navigate(`/racha/${first.id}/financeiro`, { replace: true })
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
