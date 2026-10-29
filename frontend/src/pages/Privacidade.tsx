import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PaginaInstitucional from '../components/PaginaInstitucional'

const ATUALIZADA_EM = '29 de outubro de 2026'

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-black text-white">{titulo}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}

export default function Privacidade() {
  return (
    <PaginaInstitucional titulo="Política de privacidade">
      <p className="text-sm text-gray-500">Atualizada em {ATUALIZADA_EM}.</p>

      <p>
        O QuemJogaFC ajuda a organizar rachas de futebol, basquete e vôlei: jogos, presença, times, escalação,
        partida ao vivo e caixa. Esta página explica quais dados usamos, para quê e como você pode apagá-los,
        seguindo a Lei Geral de Proteção de Dados (LGPD).
      </p>

      <Secao titulo="Dados que coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-white">Conta:</strong> nome, e-mail e/ou telefone e senha (guardada só como código, nunca em texto).</li>
          <li><strong className="text-white">Perfil de atleta:</strong> apelido, posição, perna boa, número da camisa e foto, se você enviar.</li>
          <li><strong className="text-white">Uso no racha:</strong> presença nos jogos, times, escalação, lances da partida (gols, cestas, pontos, cartões) e registros do caixa, como mensalidades e multas.</li>
          <li><strong className="text-white">Login com Google:</strong> nome e e-mail da sua conta Google, só para entrar.</li>
        </ul>
        <p>Não coletamos localização, contatos do celular nem dados de cartão.</p>
      </Secao>

      <Secao titulo="Para que usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fazer o app funcionar: entrar, participar dos rachas e mostrar jogos, placar e caixa.</li>
          <li>Mostrar seus dados para os outros membros do mesmo racha (nome, foto, posição, presença e estatísticas).</li>
          <li>Enviar e-mails necessários, como a redefinição de senha.</li>
          <li>Responder o que você mandar pelo suporte (guardamos a mensagem, o e-mail e a tela de onde veio).</li>
        </ul>
        <p>Não vendemos seus dados e não usamos para publicidade.</p>
      </Secao>

      <Secao titulo="Com quem compartilhamos">
        <p>Só com os serviços que fazem o app funcionar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-white">Railway</strong>: hospedagem do app e do banco de dados.</li>
          <li><strong className="text-white">Google</strong>: login com a conta Google, quando você escolhe essa opção.</li>
          <li><strong className="text-white">Brevo</strong>: envio de e-mails, como a redefinição de senha e as respostas do suporte.</li>
        </ul>
      </Secao>

      <Secao titulo="Por quanto tempo guardamos">
        <p>
          Enquanto sua conta existir. Quando você exclui a conta, apagamos login, perfil, foto e acesso de admin na hora.
          Seu nome continua no histórico do racha (jogos, presença e caixa), sem ligação com nenhuma conta, porque esses
          registros pertencem ao racha e ao seu organizador.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>
          Você pode ver e corrigir seus dados no perfil do app e{' '}
          <Link to="/excluir-conta" className="font-bold text-emerald-400 hover:underline">excluir sua conta</Link> quando quiser.
          {' '}Para qualquer outro pedido sobre seus dados, fale com a gente pelo{' '}
          <Link to="/suporte?assunto=dados&de=/privacidade" className="font-bold text-emerald-400 hover:underline">
            formulário de suporte
          </Link>
          .
        </p>
      </Secao>

      <Secao titulo="Segurança">
        <p>
          A conexão com o app é criptografada (HTTPS), as senhas são guardadas só como código e cada racha só é visto por
          quem participa dele.
        </p>
      </Secao>

      <Secao titulo="Crianças">
        <p>O QuemJogaFC não é feito para menores de 13 anos.</p>
      </Secao>

      <Secao titulo="Mudanças nesta política">
        <p>Se mudarmos algo importante, avisamos no app e atualizamos a data no topo desta página.</p>
      </Secao>
    </PaginaInstitucional>
  )
}
