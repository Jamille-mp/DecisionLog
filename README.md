# DecisionLog

Sistema web para registrar, acompanhar e auditar decisoes de projeto.

## Tecnologias

- Frontend: React, TypeScript e Vite
- Backend: Node.js, Express e TypeScript
- Banco relacional: MySQL com Prisma
- Auditoria: MongoDB com driver nativo
- Autenticacao: JWT
- Validacao: Zod

## Estrutura

```text
client/  Frontend React
server/  API Express, Prisma, autenticacao e auditoria
```

## Configuracao Do Backend

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

## Usuario De Demonstracao

```text
E-mail: admin@decisionlog.local
Senha: 123456
```

## Funcionalidades

- Cadastro e login de usuarios
- Registro de decisoes
- Listagem com busca textual
- Filtro por status
- Dashboard com totais por status
- Graficos de distribuicao das decisoes
- Layout corporativo com menu lateral
- Aprovar, arquivar e excluir decisoes
- Edicao completa de decisoes
- Tela de auditoria dos logs do MongoDB
- Auditoria em MongoDB para acoes relevantes
- Tratamento global de erros

## Rotas Principais

```text
POST /auth/register
POST /auth/login
GET  /decisions
POST /decisions
PUT  /decisions/:id
DELETE /decisions/:id
GET  /audit-logs
```

Filtros:

```text
GET /decisions?status=approved
GET /decisions?search=mysql
GET /decisions?status=approved&search=mysql
```
