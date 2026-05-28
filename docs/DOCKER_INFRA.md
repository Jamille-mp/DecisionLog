# Infraestrutura local com Docker

Este projeto pode usar Docker para subir MySQL, MongoDB e RabbitMQ juntos, sem instalar/configurar cada serviço manualmente.

## O que cada serviço faz

- MySQL: guarda usuários, departamentos e decisões.
- MongoDB: guarda logs de auditoria.
- RabbitMQ: publica eventos de domínio para integrações futuras.

O RabbitMQ é opcional no funcionamento diário. Se `EVENT_BROKER_MODE` estiver como `memory`, o sistema roda sem RabbitMQ. Se estiver como `rabbitmq`, a API publica os eventos no broker.

Para a apresentação completa da arquitetura corporativa, use `EVENT_BROKER_MODE="rabbitmq"` com o container `rabbitmq` ativo. Assim o health check passa a mostrar eventos em modo RabbitMQ, em vez de apenas memória local.

## Subir os serviços

Na raiz do projeto:

```powershell
docker compose up -d
```

Depois rode o backend normalmente:

```powershell
cd server
npm.cmd run prisma:migrate
npm.cmd run seed
npm.cmd run dev
```

E o frontend:

```powershell
cd client
npm.cmd run dev
```

## Configuração do backend

Para usar os serviços do Docker a partir do backend rodando no Windows, o `server/.env` pode ficar assim:

```env
DATABASE_URL="mysql://root:2010005@localhost:3306/decisionlog"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
DATABASE_USER="root"
DATABASE_PASSWORD="2010005"
DATABASE_NAME="decisionlog"
MONGODB_URL="mongodb://localhost:27017/decisionlog_logs"
JWT_SECRET="change-this-secret"
PORT=3333
EVENT_BROKER_MODE="rabbitmq"
RABBITMQ_URL="amqp://localhost:5672"
RABBITMQ_EXCHANGE="decisionlog.events"
```

Para rodar sem RabbitMQ durante desenvolvimento rápido:

```env
EVENT_BROKER_MODE="memory"
```

Depois reinicie o backend.

## Painel do RabbitMQ

Com o serviço rodando, acesse:

```text
http://localhost:15672
```

Credenciais padrão:

```text
Usuário: guest
Senha: guest
```

## Parar os serviços

```powershell
docker compose down
```

Para apagar também os dados persistidos nos volumes:

```powershell
docker compose down -v
```

Use `-v` com cuidado, porque remove bancos e filas locais.

## Atenção a conflitos de porta

Se você já tiver MySQL ou MongoDB instalados como serviço do Windows nas mesmas portas, o Docker pode não conseguir subir.

Portas usadas:

- MySQL: `3306`
- MongoDB: `27017`
- RabbitMQ: `5672`
- Painel RabbitMQ: `15672`
