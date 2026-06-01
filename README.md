# DecisionLog

Sistema web para registrar, acompanhar e auditar decisões corporativas.

## Tecnologias

- Frontend: React, TypeScript e Vite
- Backend: Node.js, Express e TypeScript
- Banco relacional: MySQL com Prisma
- Auditoria: MongoDB com driver nativo
- Autenticação: JWT local e OpenID Connect/OAuth2 com Google
- Validação: Zod
- Testes: Vitest e Supertest
- Infraestrutura opcional: Docker Compose com MySQL, MongoDB e RabbitMQ

## Estrutura

```text
client/  Frontend React
server/  API Express, Prisma, autenticação, RBAC e auditoria
```

## Configuração do Backend

Crie o arquivo `server/.env` com base em `server/.env.example`.

Crie também o arquivo `client/.env` com base em `client/.env.example` e ajuste `VITE_API_URL` para a URL do backend.

Exemplo:

```env
DATABASE_URL="mysql://root:password@localhost:3306/decisionlog"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
DATABASE_USER="root"
DATABASE_PASSWORD="password"
DATABASE_NAME="decisionlog"
MONGODB_URL="mongodb://localhost:27017/decisionlog_logs"
JWT_SECRET="change-this-secret"
PORT=3333
```

Para habilitar login institucional via OAuth2/OpenID Connect, preencha também:

```env
OIDC_PROVIDER_NAME="Entrar com Google"
OIDC_ISSUER_URL="https://accounts.google.com"
OIDC_CLIENT_ID="decisionlog-client-id"
OIDC_CLIENT_SECRET="decisionlog-client-secret"
OIDC_REDIRECT_URI="http://localhost:3333/auth/oidc/callback"
OIDC_FRONTEND_REDIRECT_URL="http://localhost:5173"
OIDC_STATE_SECRET="change-this-oidc-state-secret"
```

Em homologação, o provedor configurado é o Google. As variáveis sensíveis (`OIDC_CLIENT_SECRET`,
`JWT_SECRET`, senhas de banco e strings de conexão) devem ficar somente nas variáveis de ambiente
do Render/Vercel e nunca devem ser enviadas ao GitHub.

Sem essas variáveis, o botão de SSO fica oculto e o login por e-mail/senha continua funcionando normalmente.

## Ambiente de Homologação

```text
Frontend: https://decision-log-rouge.vercel.app
Backend:  https://decisionlog-api.onrender.com
Health:   https://decisionlog-api.onrender.com/health
```

O login com Google fica disponível quando `GET /auth/oidc/config` retorna `enabled: true`.

## Como Rodar

Infraestrutura opcional com Docker:

```powershell
docker compose up -d
```

Backend:

```powershell
cd server
npm.cmd install
npm.cmd run prisma:migrate
npm.cmd run seed
npm.cmd run dev
```

Frontend:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

URLs:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://localhost:3333
```

## Usuários de Demonstração

```text
Administrador: admin@decisionlog.local / DecisionLog@26
Gestor:        analista@decisionlog.local / DecisionLog@26
Auditor:       auditor@decisionlog.local / DecisionLog@26
```

## Funcionalidades

- Cadastro e login de usuários
- Login institucional com Google via OAuth2/OpenID Connect
- Perfis de acesso: Administrador, Gestor e Auditor
- Gestão administrativa de usuários e permissões
- Cadastro e ativação/inativação de departamentos
- Registro de decisões com departamento e impacto
- Listagem com busca textual
- Dashboard com totais e gráficos por departamento/impacto
- Edição completa de decisões
- Exclusão lógica por inativação
- Auditoria no MongoDB com estado anterior e novo estado
- Consulta de auditoria por decisão
- Tela de auditoria restrita a Administradores e Auditores
- Health check com MySQL, MongoDB e circuito de eventos
- Publicação interna de eventos de domínio com circuit breaker simples
- Tratamento global de erros
- Testes automatizados de API e interface
- Exportação de histórico em CSV/PDF
- Arquivamento e desarquivamento de decisões

## Rotas Principais

```text
POST /auth/register
POST /auth/login
GET  /auth/oidc/config
GET  /auth/oidc/start
GET  /auth/oidc/callback
GET  /decisions
POST /decisions
PUT  /decisions/:id
DELETE /decisions/:id
GET  /departments
POST /departments
PATCH /departments/:id
GET  /users
PATCH /users/:id
GET  /audit-logs
GET  /audit-logs/decisions/:decisionId
GET  /health
```

Filtros:

```text
GET /decisions?status=approved
GET /decisions?search=mysql
GET /decisions?status=approved&search=mysql
GET /decisions?includeInactive=true
```

## Verificação

Backend:

```powershell
cd server
npm.cmd run build
npm.cmd test
```

Frontend:

```powershell
cd client
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

## Deploy

O passo a passo recomendado para homologação está em `DEPLOY_GUIDE.md`.
