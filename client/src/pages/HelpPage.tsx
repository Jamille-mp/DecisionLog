import { PageHeader } from '../components/shared/PageHeader'
import type { RoleLabel } from '../types'

export function HelpPage({ companyName, userRole }: { companyName: string; userRole: RoleLabel }) {
  return (
    <section className="page-section">
      <PageHeader
        badge={`${companyName} · ${userRole}`}
        subtitle="Entenda a proposta do DecisionLog, os perfis de acesso e os caminhos mais importantes."
        title="Ajuda e Sobre o Sistema"
      />
      <div className="about-panel">
        <div>
          <span className="section-eyebrow">DecisionLog</span>
          <h2>Plataforma corporativa para registrar, acompanhar e auditar decisões</h2>
          <p>
            O sistema centraliza decisões organizacionais com responsáveis, departamentos,
            impacto, status e histórico de alterações. A proposta é reduzir perda de contexto,
            melhorar a prestação de contas e apoiar auditorias internas.
          </p>
        </div>
        <div className="about-metrics">
          <span>MySQL para dados estruturados</span>
          <span>MongoDB para auditoria</span>
          <span>RabbitMQ para eventos</span>
          <span>JWT, permissões e LGPD</span>
        </div>
      </div>
      <div className="help-grid">
        <article className="help-card">
          <h2>Para que serve</h2>
          <p>O DecisionLog registra decisões, contexto, motivo, impacto, status e responsáveis para preservar rastreabilidade e apoiar auditorias.</p>
        </article>
        <article className="help-card">
          <h2>Fluxo básico</h2>
          <p>Gestores e administradores registram decisões. Auditores acompanham histórico e alterações. Administradores organizam usuários, permissões e departamentos.</p>
        </article>
        <article className="help-card">
          <h2>Dicas rápidas</h2>
          <p>Use filtros por status, impacto, departamento e data para encontrar registros. A visão geral mostra indicadores rápidos, e os detalhes ficam nas telas de histórico e auditoria.</p>
        </article>
        <article className="help-card">
          <h2>Problemas comuns</h2>
          <p>Se a API parecer indisponível, um administrador pode verificar MySQL, MongoDB e eventos na tela de monitoramento. Se esquecer a senha, use a recuperação na tela de login.</p>
        </article>
      </div>
      <div className="help-grid compact">
        <article className="help-card">
          <h2>Exemplo de uso</h2>
          <p>Um gestor registra a aprovação de uma política, informa o impacto e vincula ao departamento. Depois, edições e inativações ficam rastreadas para auditoria.</p>
        </article>
        <article className="help-card">
          <h2>Perfis de acesso</h2>
          <p>Administrador gerencia usuários, departamentos e monitoramento. Gestor cria e acompanha decisões. Auditor consulta histórico e alterações sem modificar registros.</p>
        </article>
      </div>
      <div className="faq-panel">
        <div className="profile-panel-header">
          <h2>Perguntas frequentes</h2>
          <p>Situações comuns em operações reais e como agir dentro da plataforma.</p>
        </div>
        <div className="faq-grid">
          <article>
            <h3>Registrei uma decisão com informação errada. O que faço?</h3>
            <p>Use a ação de editar no histórico. A alteração fica registrada na trilha de auditoria para manter transparência.</p>
          </article>
          <article>
            <h3>Uma decisão foi concluída, mas ainda precisa ficar visível.</h3>
            <p>Altere o status para concluída. Arquive somente quando ela não exigir acompanhamento ativo, mas ainda precisar ser consultada.</p>
          </article>
          <article>
            <h3>Não encontro uma decisão antiga.</h3>
            <p>Use filtros por departamento, impacto, status e período. Decisões arquivadas continuam aparecendo no histórico.</p>
          </article>
          <article>
            <h3>O sistema mostra API com atenção.</h3>
            <p>Um administrador deve abrir Monitoramento e verificar MySQL, MongoDB e mensageria para identificar qual componente precisa de ação.</p>
          </article>
          <article>
            <h3>Um colaborador mudou de área.</h3>
            <p>O administrador deve abrir Usuários e Permissões, ver os detalhes do funcionário e atualizar o departamento vinculado.</p>
          </article>
          <article>
            <h3>Esqueci minha senha.</h3>
            <p>Na tela de login, use Esqueci minha senha. Depois informe o código recebido para cadastrar uma nova senha segura.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
