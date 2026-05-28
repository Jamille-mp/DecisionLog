# LGPD, termos e consentimento

O DecisionLog registra o aceite de Termos de Uso e Política de Privacidade no cadastro. O objetivo não é apenas demonstrativo: sem os aceites obrigatórios, o backend rejeita o cadastro.

## Dados pessoais tratados

- Nome: usado para identificação do usuário, autoria de decisões e exibição no perfil.
- E-mail: usado para login, identificação única da conta e recuperação de senha.
- Contato: campo opcional para suporte interno ou comunicação administrativa.
- Perfil de acesso: define permissões de Administrador, Gestor ou Auditor.
- Preferência visual: guarda modo claro ou escuro.
- Datas de aceite: comprovam que Termos de Uso e Política de Privacidade foram aceitos.
- Identificador do usuário: vincula decisões e alterações à conta autenticada.

## Finalidade do tratamento

Os dados existem para autenticação, autorização, governança, rastreabilidade das decisões, gestão de permissões e segurança operacional. A aplicação evita expor dados além do necessário: por exemplo, na listagem de decisões a autoria não precisa mostrar e-mail para todos.

## Quem pode acessar

- O próprio usuário acessa e edita nome, contato, senha e tema em seu perfil.
- Administradores acessam a lista de usuários para gestão de permissões e ativação/inativação de contas.
- Gestores e Auditores não acessam a administração de usuários.
- Logs e histórico de alterações devem ser acessados apenas por perfis autorizados.

## Consentimento

No cadastro, o usuário deve aceitar:

- Termos de Uso.
- Política de Privacidade e tratamento de dados conforme a LGPD.

O sistema grava `termsAcceptedAt` e `privacyAcceptedAt` na tabela `users`.

## Segurança e recuperação de senha

O fluxo “Esqueci minha senha” gera um token temporário com validade de 30 minutos. O banco armazena apenas o hash do token, e o token é apagado depois da troca de senha.

Em ambiente de desenvolvimento, a API retorna o token para facilitar testes locais. Em produção, o token deve ser enviado por e-mail ou outro canal seguro.

## Direitos do titular

O usuário pode atualizar dados básicos diretamente no perfil. Solicitações adicionais, como revisão de dados, inativação de conta ou correção administrativa, devem ser tratadas pelo administrador responsável pelo sistema.

## Retenção e auditoria

Dados de decisões e histórico de alterações podem ser mantidos para preservar a integridade, a rastreabilidade e a prestação de contas do processo decisório. A retenção deve seguir a política da organização responsável pelo uso do sistema.
