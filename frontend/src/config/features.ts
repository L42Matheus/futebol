// Feature flags do frontend. Espelham as flags do backend.
// Enquanto o pagamento estiver desativado, o app roda em modo grátis:
// nada de menu "Assinatura", nada de formulário Asaas.

export const PAYMENTS_ENABLED =
  import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
