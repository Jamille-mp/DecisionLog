# Backup e recuperação

Este guia registra o procedimento operacional para proteger os dados locais do DecisionLog.

## Gerar backups

Execute os comandos na pasta `server`:

```powershell
npm.cmd run backup:mysql
npm.cmd run backup:mongodb
```

Ou gere os dois de uma vez:

```powershell
npm.cmd run backup:all
```

Os arquivos são salvos em `backups/`, fora do versionamento do Git.

## Restaurar MySQL

1. Garanta que o serviço MySQL esteja iniciado.
2. Escolha o arquivo `.sql` em `backups/mysql`.
3. Execute:

```powershell
mysql -u root -p < caminho\do\backup.sql
```

## Restaurar MongoDB

1. Garanta que o serviço MongoDB esteja iniciado.
2. Escolha a pasta do backup em `backups/mongodb`.
3. Execute:

```powershell
mongorestore --uri="mongodb://localhost:27017" caminho\da\pasta
```

## Frequência recomendada

- Ambiente acadêmico: antes de cada entrega e depois de mudanças grandes.
- Ambiente real: rotina diária automatizada e cópia externa protegida.
- Sempre testar a restauração em uma base separada antes de considerar o backup confiável.
