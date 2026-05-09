/**
 * Landing page do Sobra (raiz `/`).
 *
 * Server Component. Importa landing-styles.css com os estilos exclusivos
 * da landing — não vazam pra outras rotas porque Next só inclui esse CSS
 * quando renderiza essa page.
 *
 * O FAQ accordion é um Client Component (./_landing/faq.tsx).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { Faq, type FaqItem } from './_landing/faq'
import './landing-styles.css'

// Número de WhatsApp comercial do Sobra
const WHATSAPP_NUMBER = '555436983995'
const WHATSAPP_MSG =
  'Oi! Vi a landing do Sobra e quero entender como começar a organizar meu caixa.'
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

export const metadata: Metadata = {
  title: 'Sobra — Finanças simples para MEI',
  description:
    'O Sobra é uma ferramenta simples para acompanhar entradas, saídas, cobranças e boletos. Comece com ajuda pelo WhatsApp e use no dia a dia sem depender de planilha.',
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Preciso saber de contabilidade para usar?',
    a: 'Não. O Sobra foi feito para quem não é contador. Se você sabe o que recebeu e o que pagou hoje, já é suficiente para usar.',
  },
  {
    q: 'Meus dados financeiros ficam seguros?',
    a: 'Sim. Usamos criptografia de ponta e os seus dados nunca são compartilhados com terceiros. Somos compatíveis com a LGPD e os dados ficam em servidores no Brasil.',
  },
  {
    q: 'Posso cancelar a qualquer hora?',
    a: 'Sim, sem multa e sem burocracia. Você cancela em dois cliques dentro do próprio app. Sem ligar pra ninguém, sem justificar nada.',
  },
  {
    q: 'Funciona para quem tem funcionários ou sócios?',
    a: 'Sim. No plano Crescer você pode adicionar sócios e colaboradores com acesso controlado — cada um vê só o que precisa ver.',
  },
  {
    q: 'O que é o Open Finance? Preciso habilitar?',
    a: 'Open Finance é o sistema do Banco Central que permite conectar sua conta bancária ao Sobra com segurança. É opcional — sem ele, você lança os valores manualmente. Com ele, o extrato entra sozinho.',
  },
]

// SVG do logo (símbolo) — reutilizado em vários lugares
function LogoSymbol({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.9)" strokeWidth="7" />
      <path d="M50 68V34" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <path d="M32 52L50 34L68 52" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="74" r="5" fill="#5DCAA5" />
    </svg>
  )
}

function CheckSvg() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1.5 4L3 5.5L6.5 2" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function LandingPage() {
  return (
    <>
      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <div className="nav-logo-icon">
            <LogoSymbol />
          </div>
          <span className="nav-logo-text">sobra</span>
        </a>
        <div className="nav-links">
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <a href="#faq">Dúvidas</a>
          <Link href="/login">Entrar</Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener"
            className="btn-nav"
          >
            Começar com ajuda
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-pattern" />
        <div className="hero-glow" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              Feito para MEI e ME
            </div>
            <h1 className="hero-h1">
              Descubra o que <em>sobra</em>
              <br />
              no seu negócio.
            </h1>
            <p className="hero-sub">
              O Sobra é uma ferramenta simples para acompanhar entradas, saídas,
              cobranças e boletos. Você começa com ajuda pelo WhatsApp e depois
              usa no dia a dia sem depender de planilha.
            </p>
            <div className="hero-form cta-row" id="comecar">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener"
                className="btn-hero"
              >
                Quero organizar meu caixa
              </a>
              <a href="#como-funciona" className="btn-hero secondary">
                Ver como funciona
              </a>
            </div>
            <div className="hero-fine">
              <div className="hero-fine-item">
                <div className="hero-fine-check"><CheckSvg /></div>
                Teste funcionando
              </div>
              <div className="hero-fine-item">
                <div className="hero-fine-check"><CheckSvg /></div>
                Ajuda para começar
              </div>
              <div className="hero-fine-item">
                <div className="hero-fine-check"><CheckSvg /></div>
                Sem cartão
              </div>
            </div>
          </div>

          {/* DASHBOARD MOCKUP */}
          <div className="hero-mockup">
            <div className="flow-trails">
              <span /><span /><span /><span />
            </div>
            <div className="mockup-chip one">Alerta antes de vencer</div>
            <div className="mockup-chip two">Ajuda para começar</div>
            <div className="mockup-chip three">Saldo atualizado</div>
            <div className="dash">
              <div className="dash-bar">
                <div className="dash-bar-logo">
                  <LogoSymbol size={14} />
                  sobra
                </div>
                <div className="dash-bar-greeting">Oi, Marcos</div>
              </div>
              <div className="dash-body">
                <div className="dash-hero-card">
                  <div className="dash-hero-label">o que sobrou esse mês</div>
                  <div className="dash-hero-value">R$ 3.420</div>
                  <div className="dash-hero-sub">de R$ 8.900 faturados</div>
                  <div className="dash-trend">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 7L5 3L8 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    +18% vs mês anterior
                  </div>
                </div>
                <div className="dash-mini-grid">
                  <div className="dash-mini">
                    <div className="dash-mini-label">a receber</div>
                    <div className="dash-mini-val">R$ 1.200</div>
                    <div className="dash-mini-sub">2 clientes</div>
                  </div>
                  <div className="dash-mini">
                    <div className="dash-mini-label">a pagar</div>
                    <div className="dash-mini-val danger">R$ 480</div>
                    <div className="dash-mini-sub">vence em 3 dias</div>
                  </div>
                </div>
                <div className="dash-section-title">últimas movimentações</div>
                <div className="dash-item">
                  <div className="dash-item-left">
                    <div className="dash-item-dot" style={{ background: '#1D9E75' }} />
                    <div>
                      <div className="dash-item-name">Serviço — Ana Paula</div>
                      <div className="dash-item-date">hoje</div>
                    </div>
                  </div>
                  <div className="dash-item-val in">+R$ 800</div>
                </div>
                <div className="dash-item">
                  <div className="dash-item-left">
                    <div className="dash-item-dot" style={{ background: '#D94040' }} />
                    <div>
                      <div className="dash-item-name">Fornecedor — materiais</div>
                      <div className="dash-item-date">ontem</div>
                    </div>
                  </div>
                  <div className="dash-item-val out">-R$ 230</div>
                </div>
                <div className="dash-item">
                  <div className="dash-item-left">
                    <div className="dash-item-dot" style={{ background: '#1D9E75' }} />
                    <div>
                      <div className="dash-item-name">Serviço — João Carlos</div>
                      <div className="dash-item-date">seg</div>
                    </div>
                  </div>
                  <div className="dash-item-val in">+R$ 1.500</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="social">
        <div className="social-item">
          <div className="social-num">15M+</div>
          <div className="social-label">MEIs no Brasil</div>
        </div>
        <div className="social-item">
          <div className="social-num">300+</div>
          <div className="social-label">clientes ativos</div>
        </div>
        <div className="social-item">
          <div className="social-num">R$ 2M+</div>
          <div className="social-label">organizados no caixa</div>
        </div>
        <div className="social-item">
          <div className="social-num">5 min</div>
          <div className="social-label">para configurar</div>
        </div>
      </div>

      {/* PRODUCT VALUE */}
      <section className="whatsapp-value">
        <div className="whatsapp-value-inner">
          <div className="section-tag">dentro do Sobra</div>
          <div className="whatsapp-value-grid">
            <div className="whatsapp-value-card">
              <div className="whatsapp-value-icon">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <rect x="3" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="whatsapp-value-title">Boletos a vencer</div>
              <div className="whatsapp-value-text">Veja o que precisa ser pago e receba alertas para não perder prazo.</div>
            </div>
            <div className="whatsapp-value-card">
              <div className="whatsapp-value-icon">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M4 12.5C5.4 10.8 7.1 10 9 10C10.9 10 12.6 10.8 14 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="whatsapp-value-title">Clientes pendentes</div>
              <div className="whatsapp-value-text">Acompanhe quem ainda precisa pagar e organize cobranças sem depender da memória.</div>
            </div>
            <div className="whatsapp-value-card">
              <div className="whatsapp-value-icon">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M4 13V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 13V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="whatsapp-value-title">Resumo da semana</div>
              <div className="whatsapp-value-text">Quanto entrou, saiu e sobrou, com visão simples direto no painel.</div>
            </div>
            <div className="whatsapp-value-card">
              <div className="whatsapp-value-icon">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M3 11L7 7L10 10L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 5H15V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="whatsapp-value-title">Saldo projetado</div>
              <div className="whatsapp-value-text">Uma visão dos próximos dias para decidir antes do caixa apertar.</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="section">
        <div className="section-inner">
          <div className="section-tag">o problema</div>
          <h2 className="section-h2">Você já passou por alguma dessas situações?</h2>
          <p className="section-sub">São as dores mais comuns de quem toca um negócio sozinho — e que o Sobra resolve.</p>
          <div className="pain-grid">
            <div className="pain-card">
              <div className="pain-icon" style={{ background: '#FCEBEB' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="#A32D2D" strokeWidth="1.5" />
                  <line x1="9" y1="5.5" x2="9" y2="9.5" stroke="#A32D2D" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="12" r="0.9" fill="#A32D2D" />
                </svg>
              </div>
              <div className="pain-title">&ldquo;Não sei quanto sobrou&rdquo;</div>
              <div className="pain-text">Faturou bem mas não sabe se teve lucro de verdade. O dinheiro some e você não sabe pra onde foi.</div>
            </div>
            <div className="pain-card">
              <div className="pain-icon" style={{ background: '#FAEEDA' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="4" width="14" height="10" rx="2" stroke="#854F0B" strokeWidth="1.5" />
                  <line x1="2" y1="7.5" x2="16" y2="7.5" stroke="#854F0B" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="pain-title">&ldquo;Esqueci de cobrar&rdquo;</div>
              <div className="pain-text">Serviço feito, nota emitida, mas a cobrança caiu no esquecimento. Dinheiro parado na mão do cliente.</div>
            </div>
            <div className="pain-card">
              <div className="pain-icon" style={{ background: '#FCEBEB' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2.5L10.8 7H15.5L11.8 9.5L13.2 14L9 11.5L4.8 14L6.2 9.5L2.5 7H7.2L9 2.5Z" stroke="#A32D2D" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="pain-title">&ldquo;Conta veio no vermelho&rdquo;</div>
              <div className="pain-text">Boleto venceu sem você saber. Multa, juros e constrangimento com o fornecedor.</div>
            </div>
            <div className="pain-card">
              <div className="pain-icon" style={{ background: '#F1EFE8' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="4" y="2.5" width="10" height="13" rx="2" stroke="#5F5E5A" strokeWidth="1.5" />
                  <line x1="6.5" y1="7" x2="11.5" y2="7" stroke="#5F5E5A" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="6.5" y1="10" x2="11.5" y2="10" stroke="#5F5E5A" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="pain-title">&ldquo;Planilha é um caos&rdquo;</div>
              <div className="pain-text">Começou bem, mas desatualizou. Agora você tem medo de olhar porque sabe que está incompleta.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="como-funciona">
        <div className="features-inner">
          <div className="section-tag">como funciona</div>
          <h2 className="section-h2">Tudo que você precisa.<br />Nada que você não precisa.</h2>
          <p className="section-sub" style={{ marginBottom: '48px' }}>Sem jargão financeiro. Em 5 minutos você já vê seu caixa do dia.</p>
          <div className="features-grid">

            <div className="feat-card featured">
              <div>
                <div className="feat-num">01</div>
                <div className="feat-title-white">Alertas automáticos antes de vencer</div>
                <div className="feat-text-white">O Sobra organiza boletos, cobranças e recebimentos no painel. Quando algo importante se aproxima, você recebe um aviso para agir a tempo.</div>
              </div>
              <div className="feat-visual">
                <div className="whatsapp-showcase">
                  <div className="whatsapp-phone">
                    <div className="whatsapp-topbar">
                      <div className="whatsapp-avatar">s</div>
                      <div>
                        <div className="whatsapp-name">Sobra</div>
                        <div className="whatsapp-status">alertas automáticos</div>
                      </div>
                    </div>
                    <div className="whatsapp-chat">
                      <div className="whatsapp-bubble">
                        <div className="whatsapp-sender">Sobra</div>
                        <div className="whatsapp-text">Oi Marcos! O boleto da Distribuidora Silva vence em 3 dias.</div>
                        <div className="whatsapp-time">09:12 ✓✓</div>
                      </div>
                      <div className="whatsapp-bubble compact">
                        <div className="whatsapp-text">Valor: <strong>R$ 480,00</strong><br />Vencimento: sexta-feira</div>
                        <div className="whatsapp-time">09:12 ✓✓</div>
                      </div>
                      <div className="whatsapp-bubble">
                        <div className="whatsapp-sender">Sobra</div>
                        <div className="whatsapp-text">Também tem <strong>R$ 1.200</strong> a receber de 2 clientes esta semana.</div>
                        <div className="whatsapp-time">09:13 ✓✓</div>
                      </div>
                    </div>
                  </div>
                  <div className="whatsapp-alert-chip">Alerta enviado antes do vencimento</div>
                </div>
              </div>
            </div>

            <div className="feature-inline-cta">
              <div>
                <div className="feature-inline-title">Quer ver isso no seu negócio?</div>
                <div className="feature-inline-text">Me chama, conta como você controla cobranças e boletos hoje, e eu te mostro como o Sobra pode funcionar na sua rotina.</div>
                <div className="feature-inline-safe">O WhatsApp é só para começar. Depois, seu caixa fica organizado no Sobra.</div>
              </div>
              <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-inline">Quero ver na prática</a>
            </div>

            <div className="feat-card">
              <div className="feat-num-dark">02</div>
              <div className="feat-title">Caixa em tempo real</div>
              <div className="feat-text">Quanto entrou, quanto saiu e o saldo de hoje. Com projeção dos próximos 30 dias para você não ser pego de surpresa.</div>
            </div>

            <div className="feat-card">
              <div className="feat-num-dark">03</div>
              <div className="feat-title">DRE em um clique</div>
              <div className="feat-text">Gere um PDF com sua DRE mensal em segundos. Já no formato que o contador precisa — sem você precisar montar nada.</div>
            </div>

            <div className="feat-card">
              <div className="feat-num-dark">04</div>
              <div className="feat-title">Configuração automática</div>
              <div className="feat-text">Diz que você é fotógrafo, eletricista ou vendedor — e as categorias já aparecem prontas. Sem precisar inventar nada.</div>
            </div>

            <div className="feat-card">
              <div className="feat-num-dark">05</div>
              <div className="feat-title">Open Finance</div>
              <div className="feat-text">Conecte sua conta bancária e os lançamentos entram sozinhos. Sem digitar nada, sem perder tempo.</div>
            </div>

          </div>
        </div>
      </section>

      {/* VALIDACAO */}
      <section className="validation">
        <div className="validation-inner">
          <div className="validation-copy">
            <div className="section-tag">como começar</div>
            <h2 className="section-h2">Você começa com ajuda, depois toca sozinho.</h2>
            <p className="section-sub" style={{ marginBottom: 0 }}>A primeira conversa serve para entender sua rotina e deixar o Sobra pronto para o seu negócio. Depois, você acompanha tudo direto na ferramenta.</p>
            <div className="validation-note">
              <div className="validation-note-title">Sem começar do zero.</div>
              <div className="validation-note-text">Você recebe ajuda para cadastrar o básico: contas, cobranças, boletos e categorias. A partir daí, o Sobra vira sua rotina de caixa.</div>
            </div>
          </div>
          <div className="validation-steps">
            <div className="validation-step">
              <div className="validation-num">1</div>
              <div>
                <div className="validation-title">Você chama para começar</div>
                <div className="validation-text">A primeira conversa serve para entender seu tipo de negócio e como você controla o dinheiro hoje.</div>
              </div>
            </div>
            <div className="validation-step">
              <div className="validation-num">2</div>
              <div>
                <div className="validation-title">A gente organiza o básico</div>
                <div className="validation-text">Categorias, contas a pagar, contas a receber e alertas entram com ajuda para você não começar do zero.</div>
              </div>
            </div>
            <div className="validation-step">
              <div className="validation-num">3</div>
              <div>
                <div className="validation-title">Você usa no dia a dia</div>
                <div className="validation-text">Depois da configuração, você acompanha o caixa direto no Sobra e recebe os avisos mais importantes.</div>
              </div>
            </div>
            <div className="validation-step">
              <div className="validation-num">4</div>
              <div>
                <div className="validation-title">Quando crescer, fica mais automático</div>
                <div className="validation-text">A ideia é deixar cada vez menos trabalho manual para você cuidar do caixa sem perder tempo.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PERFIS */}
      <section className="profiles">
        <div className="profiles-inner">
          <div className="section-tag">para quem é</div>
          <h2 className="section-h2">Feito para quem vende, atende, entrega e ainda precisa cuidar do dinheiro.</h2>
          <p className="section-sub">O Sobra funciona melhor para negócios pequenos que já têm movimento, mas ainda dependem de memória, planilha ou extrato bancário para se organizar.</p>
          <div className="profiles-grid">
            <div className="profile-card">
              <div className="profile-kicker">Serviços</div>
              <div className="profile-title">Consultores, técnicos e autônomos</div>
              <div className="profile-text">Controle serviços recebidos, clientes pendentes e custos de cada mês sem transformar sua rotina em contabilidade.</div>
            </div>
            <div className="profile-card">
              <div className="profile-kicker">Comércio</div>
              <div className="profile-title">Lojas, revendas e pequenos estoques</div>
              <div className="profile-text">Veja o que entrou, o que saiu e quanto precisa ficar reservado para fornecedor, imposto e reposição.</div>
            </div>
            <div className="profile-card">
              <div className="profile-kicker">Atendimento</div>
              <div className="profile-title">Clínicas, estúdios e agendas cheias</div>
              <div className="profile-text">Acompanhe pagamentos por cliente e receba lembretes antes que cobrança ou boleto fiquem esquecidos.</div>
            </div>
            <div className="profile-card">
              <div className="profile-kicker">Operação</div>
              <div className="profile-title">Quem cresceu além da planilha</div>
              <div className="profile-text">Quando o extrato já não explica tudo, o Sobra ajuda a enxergar o caixa sem depender de fórmulas quebradas.</div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="testimonials">
        <div className="testimonials-inner">
          <div className="section-tag">depoimentos</div>
          <h2 className="section-h2" style={{ marginBottom: '48px' }}>Quem colocou o caixa no automático respira melhor.</h2>
          <div className="testi-grid">
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">&ldquo;Finalmente parei de misturar sensação com número. Agora sei quanto entrou, quanto saiu e quanto realmente sobrou.&rdquo;</div>
              <div className="testi-author">
                <div className="testi-avatar">AP</div>
                <div>
                  <div className="testi-name">Ana Paula R.</div>
                  <div className="testi-role">MEI — confeitaria, Belo Horizonte</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">&ldquo;O alerta do WhatsApp me salvou duas vezes. Ia esquecer de cobrar cliente e apareceu a mensagem na hora certa.&rdquo;</div>
              <div className="testi-author">
                <div className="testi-avatar">MS</div>
                <div>
                  <div className="testi-name">Marcos S.</div>
                  <div className="testi-role">MEI — manutenção elétrica, São Paulo</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">&ldquo;Antes eu mandava um monte de print pro contador. Agora o resumo já chega organizado e a conversa ficou muito mais simples.&rdquo;</div>
              <div className="testi-author">
                <div className="testi-avatar">FL</div>
                <div>
                  <div className="testi-name">Fernanda L.</div>
                  <div className="testi-role">ME — estúdio de design, Porto Alegre</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="planos">
        <div className="pricing-inner">
          <div className="section-tag">planos</div>
          <h2 className="section-h2" style={{ marginBottom: '12px' }}>Planos simples, com condição para primeiros clientes.</h2>
          <p className="section-sub" style={{ marginBottom: '56px' }}>Escolha um plano para usar o Sobra no seu negócio. Se precisar, a gente te ajuda a deixar tudo pronto no começo.</p>
          <div className="pricing-grid">
            <div className="plan-card">
              <div className="plan-name">Começar</div>
              <div className="plan-price">R$ 0</div>
              <div className="plan-cycle">para organizar os primeiros lançamentos</div>
              <div className="plan-divider" />
              <ul className="plan-features-list">
                <li><div className="plan-check"><CheckSvg /></div>Fluxo de caixa básico</li>
                <li><div className="plan-check"><CheckSvg /></div>Até 50 lançamentos/mês</li>
                <li><div className="plan-check"><CheckSvg /></div>Resumo mensal</li>
              </ul>
              <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-plan">Começar</a>
            </div>

            <div className="plan-card featured">
              <div className="plan-popular">Mais popular</div>
              <div className="plan-name">Organizar</div>
              <div className="plan-price">R$ 49</div>
              <div className="plan-cycle">/mês · valor de lançamento</div>
              <div className="plan-divider" />
              <ul className="plan-features-list">
                <li><div className="plan-check"><CheckSvg /></div>Fluxo de caixa completo</li>
                <li><div className="plan-check"><CheckSvg /></div>DRE mensal em PDF</li>
                <li><div className="plan-check"><CheckSvg /></div>Alertas via WhatsApp</li>
                <li><div className="plan-check"><CheckSvg /></div>Lançamentos ilimitados</li>
                <li><div className="plan-check"><CheckSvg /></div>Suporte por chat</li>
              </ul>
              <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-plan primary">Quero organizar meu caixa</a>
            </div>

            <div className="plan-card">
              <div className="plan-name">Crescer</div>
              <div className="plan-price">R$ 99</div>
              <div className="plan-cycle">/mês · para operações com mais volume</div>
              <div className="plan-divider" />
              <ul className="plan-features-list">
                <li><div className="plan-check"><CheckSvg /></div>Tudo do Organizar</li>
                <li><div className="plan-check"><CheckSvg /></div>Open Finance (extrato automático)</li>
                <li><div className="plan-check"><CheckSvg /></div>Múltiplos usuários</li>
                <li><div className="plan-check"><CheckSvg /></div>Relatórios avançados</li>
                <li><div className="plan-check"><CheckSvg /></div>Suporte prioritário</li>
              </ul>
              <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-plan">Ver se faz sentido</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="faq-inner">
          <div className="section-tag">dúvidas</div>
          <h2 className="section-h2" style={{ marginBottom: '40px' }}>Perguntas frequentes</h2>
          <Faq itens={FAQ_ITEMS} />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final">
        <div className="cta-final-glow" />
        <div className="cta-final-inner">
          <h2 className="cta-h2">Quer ver o Sobra funcionando no seu negócio?</h2>
          <p className="cta-sub">Eu entendo sua rotina, mostro como organizar seu caixa e te ajudo a dar os primeiros passos sem complicação.</p>
          <div className="cta-form">
            <a href={whatsappUrl} target="_blank" rel="noopener" className="btn-cta">Começar com ajuda</a>
            <a href="#planos" className="btn-cta secondary">Ver planos</a>
          </div>
          <div className="cta-fine">Ajuda humana · sem cartão · não precisa enviar dados bancários para começar</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">
          <div style={{ width: '24px', height: '24px', background: '#1D9E75', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoSymbol size={14} />
          </div>
          sobra
        </div>
        <div className="footer-links">
          <a href="#">Termos de uso</a>
          <a href="#">Privacidade</a>
          <a href="#">Contato</a>
          <Link href="/login">Entrar</Link>
        </div>
      </footer>
    </>
  )
}
