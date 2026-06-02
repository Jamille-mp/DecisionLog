# Guia de Deploy do DecisionLog

Este guia prepara uma publicação de homologação com frontend, backend, MySQL, MongoDB e, se desejado, RabbitMQ/OAuth2.

## 1. Antes de Publicar

Rode as validações locais:

```powershell
cd server
npm.cmd run build
npm.cmd test

cd ../client
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

O projeto está pronto para deploy quando esses comandos passarem.

Depois de alterações de banco, o backend executa `prisma migrate deploy` automaticamente
antes do `npm start` por meio do script `prestart`.

## 2. Plataformas Recomendadas

Opção mais simples para apresentação:

- Frontend: Vercel
- Backend: Render
- MySQL: Railway, Aiven, PlanetScale ou Clever Cloud
- MongoDB: MongoDB Atlas
- RabbitMQ: CloudAMQP ou modo `memory` para demonstração

Para a disciplina, o essencial é ter um ambiente acessível por URL pública e HTTPS.

## 3. Deploy do Banco MySQL

1. Crie uma instância MySQL em Railway, Aiven, Clever Cloud ou serviço similar.
2. Copie host, porta, usuário, senha e nome do banco.
3. Monte a URL:

```env
DATABASE_URL="mysql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO"
DATABASE_HOST="HOST"
DATABASE_PORT=PORTA
DATABASE_USER="USUARIO"
DATABASE_PASSWORD="SENHA"
DATABASE_NAME="NOME_DO_BANCO"
```

Depois do backend publicado, rode as migrations no serviço ou localmente apontando para o banco remoto:

```powershell
cd server
npm.cmd run prisma:migrate
npm.cmd run seed
```

## 4. Deploy do MongoDB

1. Crie um cluster gratuito no MongoDB Atlas.
2. Libere acesso de rede para o ambiente de homologação.
3. Crie usuário e senha do banco.
4. Use a connection string em:

```env
MONGODB_URL="mongodb+srv://USUARIO:SENHA@CLUSTER/decisionlog_logs"
```

## 5. Deploy do Backend

No Render:

1. Crie um novo `Web Service`.
2. Conecte o repositório GitHub.
3. Configure:

```text
Root Directory: server
Build Command: npm install --include=dev && npm run build
Start Command: npm start
```

4. Configure as variáveis:

```env
NODE_ENV="production"
PORT=3333
JWT_SECRET="gere-uma-chave-grande-e-segura"
CLIENT_URL="https://URL-DO-FRONTEND"
DATABASE_URL="mysql://..."
DATABASE_HOST="..."
DATABASE_PORT=3306
DATABASE_USER="..."
DATABASE_PASSWORD="..."
DATABASE_NAME="..."
MONGODB_URL="mongodb+srv://..."
EVENT_BROKER_MODE="memory"
```

Na homologação atual do DecisionLog:

```env
CLIENT_URL="https://decision-log-rouge.vercel.app"
```

Use `EVENT_BROKER_MODE="memory"` se ainda não tiver RabbitMQ externo. Para usar RabbitMQ real:

```env
EVENT_BROKER_MODE="rabbitmq"
RABBITMQ_URL="amqps://USUARIO:SENHA@HOST/VHOST"
RABBITMQ_EXCHANGE="decisionlog.events"
```

Após publicar, teste:

```text
https://URL-DO-BACKEND/health
```

## 6. Deploy do Frontend

Na Vercel:

1. Importe o repositório GitHub.
2. Configure:

```text
Root Directory: client
Build Command: npm run build
Output Directory: dist
```

3. Configure a variável:

```env
VITE_API_URL="https://URL-DO-BACKEND"
```

Na homologação atual do DecisionLog:

```env
VITE_API_URL="https://decisionlog-api.onrender.com"
```

4. Publique e teste o login.

## 7. OAuth2/OpenID com Google

Faça isso depois que backend e frontend já tiverem URLs públicas.

No Google Cloud Console:

1. Crie ou selecione um projeto.
2. Vá em `APIs e serviços > Tela de consentimento OAuth`.
3. Configure nome do app, e-mail de suporte e e-mail do desenvolvedor.
4. Vá em `Credenciais > Criar credenciais > ID do cliente OAuth`.
5. Escolha `Aplicativo da Web`.
6. Em `URIs de redirecionamento autorizados`, coloque:

```text
https://URL-DO-BACKEND/auth/oidc/callback
```

Na homologação atual:

```text
https://decisionlog-api.onrender.com/auth/oidc/callback
```

No backend, configure:

```env
OIDC_PROVIDER_NAME="Entrar com Google"
OIDC_ISSUER_URL="https://accounts.google.com"
OIDC_CLIENT_ID="CLIENT_ID_DO_GOOGLE"
OIDC_CLIENT_SECRET="CLIENT_SECRET_DO_GOOGLE"
OIDC_REDIRECT_URI="https://decisionlog-api.onrender.com/auth/oidc/callback"
OIDC_FRONTEND_REDIRECT_URL="https://decision-log-rouge.vercel.app"
OIDC_STATE_SECRET="outra-chave-grande-e-segura"
```

Depois reinicie o backend. O botão de login institucional aparece automaticamente.

Para validar:

```text
https://decisionlog-api.onrender.com/auth/oidc/config
```

Resposta esperada:

```json
{"enabled":true,"providerName":"Entrar com Google"}
```

## 8. Checklist Final

- Frontend abre por HTTPS.
- Backend `/health` retorna resposta pública.
- Login local funciona.
- Login com Google funciona via OAuth2/OpenID Connect.
- Usuário `2024130015@aesa-cesa.br` acessa a empresa AESA.
- Usuários `@decisionlog.local` acessam a empresa DecisionLog.
- Dados de usuários, departamentos, decisões e auditoria ficam isolados por empresa.
- Usuários de seed funcionam.
- Dashboard carrega indicadores.
- Cadastro de decisão exige departamento e impacto.
- Histórico exporta CSV/PDF.
- Auditoria aparece para Administrador/Auditor.
- Monitoramento mostra MySQL, MongoDB e eventos.
- MongoDB recebe logs após criar/editar uma decisão.
- O relatório técnico cita as URLs publicadas.
