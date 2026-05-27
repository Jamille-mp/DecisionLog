# LGPD, termos e consentimento

O DecisionLog registra o aceite de Termos de Uso e Política de Privacidade no cadastro do usuário.

## Dados pessoais tratados

- Nome.
- E-mail.
- Perfil de acesso.
- Histórico de ações vinculadas ao usuário autenticado.

## Finalidade

Os dados são usados para autenticação, autorização, rastreabilidade das decisões e auditoria do sistema.

## Consentimento

No cadastro, o usuário precisa aceitar:

- Termos de Uso.
- Política de Privacidade e tratamento de dados conforme a LGPD.

O backend grava `termsAcceptedAt` e `privacyAcceptedAt` na tabela `users`.

## Recuperação de senha

O fluxo de “Esqueci minha senha” gera um token temporário com validade de 30 minutos. O banco armazena apenas o hash do token, e o token é removido após a troca da senha.

Em produção, o token deve ser enviado por serviço de e-mail. Em desenvolvimento, a API retorna o token para facilitar testes locais.
