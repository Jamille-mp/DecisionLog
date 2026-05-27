# DecisionLog

Sistema web para registrar, acompanhar e auditar decisões corporativas.

## Tecnologias

- Frontend: React, TypeScript e Vite
- Backend: Node.js, Express e TypeScript
- Banco relacional: MySQL com Prisma
- Auditoria: MongoDB com driver nativo
- Autenticação: JWT
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

## Como Rodar

Infraestrutura opcional com Docker:

```powershell
docker compose up -d
```

Guia detalhado: `docs/DOCKER_INFRA.md`.

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
Administrador: admin@decisionlog.local / 123456
Gestor:        analista@decisionlog.local / 123456
Auditor:       auditor@decisionlog.local / 123456
```

## Funcionalidades

- Cadastro e login de usuários
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
- Testes automatizados mínimos da API

## Rotas Principais

```text
POST /auth/register
POST /auth/login
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
```
