# Revisão de Código Frontend — QuemJoga

> Branch: `claude/frontend-code-review-fFuD2`
> Data: 2026-03-21

---

## Sumário Executivo

O frontend está funcional e com boa base visual (Tailwind + dark mode consistente), mas apresenta vários problemas de arquitetura, duplicação de código e práticas que comprometem manutenibilidade, performance e experiência do usuário. Os pontos abaixo estão ordenados do mais crítico ao menos urgente.

---

## 1. TypeScript Adotado Pela Metade (Crítico)

### Problema

O projeto mistura `.jsx`, `.tsx` e `.ts` sem nenhum `tsconfig.json` configurado. Isso significa que os arquivos TypeScript **não estão sendo verificados pelo compilador** — eles só são transpilados pelo Vite sem validação de tipos.

```
frontend/src/
  App.jsx           ← JS
  AppRoutes.tsx     ← TS (sem config!)
  context/AuthContext.jsx      ← JS
  context/AccountTypeContext.tsx ← TS
  pages/Login.tsx   ← TS
  pages/Home.jsx    ← JS
  services/api.js   ← JS
```

Há casting inseguro como `(location.state as any)?.from?.pathname` que só existe porque o TS não está configurado corretamente.

### Por que é um problema

Sem `tsconfig.json`, você tem o custo da sintaxe TypeScript sem o benefício: nenhuma detecção de erro em tempo de desenvolvimento, nenhum intellisense preciso, e desenvolvedores confusos sobre qual extensão usar.

### Solução recomendada

**Opção A (recomendada):** Adotar TypeScript completamente — criar `tsconfig.json`, migrar todos os `.jsx`/`.js` para `.tsx`/`.ts` gradualmente.

**Opção B:** Remover TypeScript — converter todos os `.tsx`/`.ts` de volta para `.jsx`/`.js` e manter JS puro.

Continuar no meio-termo é a pior das opções.

---

## 2. Páginas Duplicadas — Dead Code (Crítico)

### Problema

Existem duas versões de Login e Register no projeto:

| Arquivo novo (em uso) | Arquivo antigo (abandonado) |
|---|---|
| `pages/Login.tsx` | `pages/LoginPage.jsx` |
| `pages/Register.tsx` | `pages/RegisterPage.jsx` |

`LoginPage.jsx` e `RegisterPage.jsx` **não estão referenciados em nenhuma rota** mas continuam no codebase. Pior: `LoginPage.jsx` **bypassa o `AuthContext`** manipulando `localStorage` diretamente, enquanto `Login.tsx` usa `useAuth()` corretamente.

### Por que é um problema

- Confunde novos desenvolvedores sobre qual é a implementação correta.
- Qualquer manutenção pode acidentalmente mexer no arquivo errado.
- `LoginPage.jsx` tem um bug: faz `localStorage.setItem('auth_token', ...)` sem atualizar o `sessionId`, quebrando a verificação `isSessionValid()`.

### Solução

Deletar `LoginPage.jsx` e `RegisterPage.jsx`.

---

## 3. N+1 Queries em `Financeiro.jsx` (Crítico — Performance)

### Problema

O `loadData` em `Financeiro.jsx` (linha 29-37) faz **uma requisição HTTP por jogador confirmado**:

```js
const confirmadosComPagamento = await Promise.all(
  jogadoresConfirmados.map(async (jogador) => {
    const historicoRes = await atletasApi.getHistorico(jogador.atleta_id) // ← N requisições!
    return { ...jogador, ja_pagou: historicoRes.data.financeiro.pagamento_confirmado_mes_atual }
  })
)
```

Com 20 jogadores confirmados = 20 requisições paralelas ao backend só para saber quem pagou.

### Por que é um problema

- Sobrecarga desnecessária no servidor e no cliente.
- Com muitos usuários simultâneos, isso pode derrubar a API.
- A latência total será a do jogador mais lento para responder.

### Solução recomendada

Criar um endpoint no backend que retorne a lista de confirmados já com o status de pagamento incluso. Ex: `GET /jogos/{id}/lista` já deveria incluir `ja_pagou`. A lógica de negócio pertence ao backend.

---

## 4. `PrivateRoute` com Responsabilidade Dupla (Arquitetura)

### Problema

`PrivateRoute.jsx` mistura duas responsabilidades distintas:

1. **Autenticação:** Redireciona para `/perfil` se não autenticado.
2. **Regra de negócio:** Verifica se atleta tem racha; redireciona para `/perfil-atleta` se não tiver.

```js
// PrivateRoute.jsx — fazendo duas coisas ao mesmo tempo
if (!isAuthenticated && !hasValidToken()) return <Navigate to="/perfil" ... />
if (user?.role === 'atleta' && !hasRacha) return <Navigate to="/perfil-atleta" ... />
```

Além disso, verifica `hasValidToken()` lendo diretamente o `localStorage` com strings hardcoded (`'auth_token'`, `'session_id'`), duplicando a lógica que já existe em `authService.isSessionValid()`.

### Por que é um problema

- Viola o princípio de responsabilidade única.
- Regras de roteamento de negócio espalhadas em componentes de infraestrutura.
- A verificação de token está duplicada — se a chave mudar em `auth.js`, precisa mudar em `PrivateRoute.jsx` também.

### Solução

Separar em dois guards:
- `AuthRoute` — só verifica autenticação.
- `AtletaRoute` (ou lógica na página `Home`) — verifica se o atleta tem racha.

```jsx
// Estrutura proposta
<Route element={<AuthRoute />}>
  <Route path="/" element={<Layout />}>
    <Route index element={<Home />} /> {/* Home decide o redirect internamente */}
    ...
  </Route>
</Route>
```

---

## 5. `useApi` Hook Criado mas Ignorado (Arquitetura)

### Problema

Existe um hook `useApi.js` que encapsula o padrão fetch/loading/error:

```js
export function useApi(apiFunc) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // ...
}
```

Mas **nenhuma página o usa**. Todas as páginas reimplementam manualmente o mesmo padrão:

```js
// Repetido em Home.jsx, Atletas.jsx, Financeiro.jsx, RachaDetail.jsx...
const [loading, setLoading] = useState(true)
const [data, setData] = useState(null)

useEffect(() => {
  async function load() {
    try { setData((await api.list()).data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  load()
}, [])
```

### Por que é um problema

- Código duplicado em 8+ arquivos.
- Erros corrigidos em um lugar não se propagam para os outros.
- Dificulta adicionar funcionalidades transversais (ex: retry automático, toast de erro).

### Solução

Usar `useApi` consistentemente, ou migrar para **React Query / TanStack Query**, que resolve cache, refetch, loading states e muito mais out-of-the-box.

---

## 6. Constantes Duplicadas (Manutenibilidade)

### Problema

`constants.tsx` define:
```ts
export const POSICAO_LABELS = { goleiro: 'Goleiro', zagueiro: 'Zagueiro', ... }
export const PAGAMENTO_TIPO_LABELS = { mensalidade: 'Mensalidade', ... }
```

Mas `Atletas.jsx` (linha 14) define novamente:
```js
const posicaoLabels = { goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral', ... }
```

E `Financeiro.jsx` (linha 18) define:
```js
const tipoLabels = { mensalidade: 'Mensalidade', rateio: 'Rateio', uniforme: 'Uniforme', ... }
```

Note que `Financeiro.jsx` até adiciona `uniforme` que **não existe** em `PAGAMENTO_TIPO_LABELS`, gerando inconsistência nos labels exibidos.

### Solução

Importar de `constants.tsx` em vez de redefinir localmente.

---

## 7. `window.confirm`, `window.prompt` e `alert` (UX/Acessibilidade)

### Problema

Vários pontos usam dialogs nativos do browser:

```js
// Home.jsx
if (!window.confirm('Deseja realmente excluir este racha?...')) return

// Atletas.jsx
if (!window.confirm('Deseja realmente excluir este atleta?')) return
alert(error.response?.data?.detail || 'Erro ao adicionar atleta')

// Financeiro.jsx
const motivo = prompt('Motivo da rejeição:')
alert('Erro ao excluir racha.')
```

### Por que é um problema

- Aparência antiquada e fora do design system.
- Não podem ser estilizados — quebram a identidade visual.
- `window.prompt()` para colher dados é especialmente ruim: sem validação, sem feedback visual, bloqueia a thread.
- Não funcionam em alguns contextos (iframes, extensões).
- Inacessíveis por leitores de tela de forma adequada.

### Solução

Criar componentes `<ConfirmDialog>` e `<Toast>` usando um sistema de modais já existente ou biblioteca leve (ex: `react-hot-toast` para notificações).

---

## 8. Admin ID Hardcoded (Bug)

### Problema

Em `Financeiro.jsx` (linhas 61 e 67):

```js
async function handleAprovar(id) {
  await pagamentosApi.aprovar(id, 1, true)  // ← admin_id = 1 hardcoded!
}

async function handleRejeitar(id) {
  await pagamentosApi.aprovar(id, 1, false, motivo) // ← admin_id = 1 hardcoded!
}
```

### Por que é um problema

Qualquer admin diferente do usuário com `id=1` será registrado incorretamente no banco. Se o backend usa `admin_id` para auditoria, o log estará errado.

### Solução

```js
const { user } = useAuth()
await pagamentosApi.aprovar(id, user.id, true)
```

---

## 9. `RachaDetail.jsx` com Visual Inconsistente (Design System)

### Problema

`RachaDetail.jsx` usa classes de tema claro (provavelmente da versão antiga do app):

```jsx
<h1 className="text-2xl font-bold text-gray-900">  {/* claro */}
<div className="bg-primary-50 ...">                 {/* claro */}
<p className="text-primary-700">                    {/* claro */}
```

Enquanto todo o resto do app usa dark mode:
```jsx
<h1 className="text-white">
<div className="bg-gray-900/40 ...">
```

`primary-*` nem está definido no Tailwind config padrão — provavelmente é uma classe herdada que não funciona.

### Solução

Alinhar `RachaDetail.jsx` ao design system do restante do app.

---

## 10. `Layout.jsx` Faz Fetch Independente do Perfil (Performance)

### Problema

`Layout.jsx` busca o perfil do usuário via `profileApi.me()` a cada mount, mesmo que `AuthContext` já tenha dados do usuário:

```js
// Layout.jsx
useEffect(() => {
  async function loadProfile() {
    const res = await profileApi.me()  // requisição extra!
    setProfile(res.data)
  }
  loadProfile()
}, [user])
```

Isso gera uma requisição extra em toda navegação que renderiza o Layout.

### Solução

Armazenar o profile no `AuthContext` junto com os dados do usuário, ou usar cache com React Query.

---

## 11. `formatDateBR` no Arquivo de API (Separação de Responsabilidades)

### Problema

`api.js` contém `formatDateBR` e `normalizeJogoPayload` — utilitários de formatação de data e transformação de payload que não têm relação com a camada de comunicação HTTP.

### Solução

Mover para `src/utils/formatters.js` ou `src/utils/date.js`. A camada de API deve cuidar apenas de comunicação.

---

## 12. `AccountTypeContext` Redundante com `AuthContext`

### Problema

`AccountTypeContext.tsx` gerencia `'ATLETA' | 'ADMIN'` em `localStorage` separadamente, mas `AuthContext` já tem `user.role` que contém a mesma informação (vinda do backend, portanto mais confiável).

Ter duas fontes de verdade para o tipo de conta é fonte de bugs onde o localStorage diz `ADMIN` mas o JWT diz `atleta`.

### Solução

Remover `AccountTypeContext` e derivar o tipo de conta de `user.role` no `AuthContext`.

---

## Resumo das Prioridades

| # | Problema | Impacto | Esforço |
|---|---|---|---|
| 3 | N+1 queries no Financeiro | Alto (performance) | Médio |
| 8 | Admin ID hardcoded | Alto (bug de dados) | Baixo |
| 2 | Páginas duplicadas | Alto (confusão/bugs) | Baixo |
| 1 | TypeScript sem config | Alto (qualidade) | Médio |
| 4 | PrivateRoute sobrecarregado | Médio (arquitetura) | Médio |
| 5 | useApi ignorado | Médio (duplicação) | Alto |
| 7 | confirm/prompt/alert | Médio (UX) | Médio |
| 6 | Constantes duplicadas | Baixo (manutenção) | Baixo |
| 9 | RachaDetail inconsistente | Baixo (visual) | Baixo |
| 10 | Fetch duplo de perfil | Baixo (performance) | Médio |
| 11 | formatDateBR em api.js | Baixo (organização) | Baixo |
| 12 | AccountTypeContext redundante | Baixo (complexidade) | Baixo |

---

## Stack Recomendada para Evolução

O projeto já tem uma boa base. As adições abaixo resolveriam vários problemas de uma vez:

- **[TanStack Query](https://tanstack.com/query)** — resolve cache, loading states, N+1 e `useApi` manual de uma vez.
- **[react-hot-toast](https://react-hot-toast.com/)** — substitui todos os `alert()` com 1 linha.
- **`tsconfig.json`** — habilitar verificação real de tipos para o que já foi escrito em TS.
