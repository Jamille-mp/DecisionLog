# Permissões e dados de usuário

O DecisionLog usa controle de acesso por perfil.

## Perfis

- Administrador: gerencia usuários, departamentos, permissões, auditoria e decisões.
- Gestor: registra decisões, consulta histórico e pode editar/inativar apenas decisões sob sua responsabilidade.
- Auditor: consulta decisões e trilhas de auditoria, sem criar, editar ou inativar decisões.

## Dados do usuário

O sistema armazena:

- Nome: identificação na interface e autoria das decisões.
- E-mail: login e recuperação de senha.
- Contato: dado opcional para suporte interno.
- Perfil de acesso: controle de permissões.
- Preferência visual: modo claro ou escuro.
- Aceites LGPD: comprovação de consentimento no cadastro.

## Quem pode ver

- O próprio usuário vê e edita nome, contato, senha e tema em “Meu Perfil”.
- Administradores veem lista de usuários para gestão de permissões e ativação/inativação.
- Gestores e Auditores não acessam a tela administrativa de usuários.
- Na listagem de decisões, a autoria mostra apenas dados mínimos necessários, como nome e perfil.

## Regras aplicadas

- Cadastro exige aceite dos Termos de Uso e Política de Privacidade.
- Apenas Administradores alteram perfis de outros usuários.
- Auditores não criam, editam ou inativam decisões.
- Gestores não editam decisões concluídas e não alteram decisões de outros usuários.
- Administradores têm acesso total para fins de governança e manutenção.
