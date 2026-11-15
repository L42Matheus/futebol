import plugin from 'tailwindcss/plugin'
import paleta from 'tailwindcss/colors'

// Verde do QuemJoga: o mesmo dos uniformes dos mascotes (verde-bandeira, mais quente que o
// esmeralda padrão do Tailwind). Substitui a paleta "emerald", então toda classe emerald-* do
// app passa a usar este verde. O 600 dos botões tem contraste 4,4:1 com texto branco.
const VERDE = {
  50: '#effbf2', 100: '#d9f6e1', 200: '#b3ebc4', 300: '#7fd99d', 400: '#4cc576', 500: '#22a957',
  600: '#168a43', 700: '#126f37', 800: '#10592e', 900: '#0d4a27', 950: '#052a15',
}

// Cores que mudam com o tema leem variáveis CSS definidas em src/index.css.
const tema = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

// Textos de destaque em tons claros (feitos para o fundo escuro) escurecem no tema claro.
const DESTAQUES = ['emerald', 'green', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose', 'red', 'orange', 'amber', 'yellow', 'lime']
const NO_CLARO = { 100: 800, 200: 700, 300: 700, 400: 600 }
const destaquesNoTemaClaro = plugin(({ addBase }) => {
  const regras = {}
  for (const cor of DESTAQUES) {
    for (const [tom, novoTom] of Object.entries(NO_CLARO)) {
      const tons = cor === 'emerald' ? VERDE : paleta[cor]
      regras[`:root.tema-claro .text-${cor}-${tom}:not(.tema-escuro *)`] = { color: tons[novoTom] }
    }
  }
  addBase(regras)
})

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: VERDE,
        emerald: VERDE,
        gray: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, tema(`gray-${n}`)]),
        ),
        white: tema('white'),
        // Branco que não inverte: texto sobre botões e áreas coloridas.
        branco: '#ffffff',
        fundo: tema('fundo'),
        painel: { DEFAULT: tema('painel'), 2: tema('painel-2') },
        cartao: tema('cartao'),
      },
    },
  },
  plugins: [destaquesNoTemaClaro],
}
