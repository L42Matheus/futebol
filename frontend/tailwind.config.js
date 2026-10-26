import plugin from 'tailwindcss/plugin'
import paleta from 'tailwindcss/colors'

// Cores que mudam com o tema leem variáveis CSS definidas em src/index.css.
const tema = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

// Textos de destaque em tons claros (feitos para o fundo escuro) escurecem no tema claro.
const DESTAQUES = ['emerald', 'green', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose', 'red', 'orange', 'amber', 'yellow', 'lime']
const NO_CLARO = { 100: 800, 200: 700, 300: 700, 400: 600 }
const destaquesNoTemaClaro = plugin(({ addBase }) => {
  const regras = {}
  for (const cor of DESTAQUES) {
    for (const [tom, novoTom] of Object.entries(NO_CLARO)) {
      regras[`:root.tema-claro .text-${cor}-${tom}:not(.tema-escuro *)`] = { color: paleta[cor][novoTom] }
    }
  }
  addBase(regras)
})

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
          800: '#065f46', 900: '#064e3b',
        },
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
