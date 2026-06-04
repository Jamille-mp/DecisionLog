import { expect, test, type Page } from '@playwright/test'

const apiBase = 'http://localhost:3333'

async function mockApi(page: Page) {
  await page.route(`${apiBase}/auth/login`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'e2e-token',
        user: {
          id: 'user-admin',
          name: 'Jamille Admin',
          email: 'admin@decisionlog.local',
          phone: '(11) 99999-0000',
          preferredTheme: 'light',
          role: 'admin',
          active: true,
          departmentId: 'department-ti',
          department: {
            id: 'department-ti',
            name: 'TI',
            active: true,
            createdAt: '2026-05-28T10:00:00.000Z',
            updatedAt: '2026-05-28T10:00:00.000Z',
          },
          createdAt: '2026-05-28T10:00:00.000Z',
        },
      }),
    })
  })

  await page.route(`${apiBase}/auth/oidc/config`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, providerName: 'Login institucional' }),
    })
  })

  await page.route(`${apiBase}/decisions**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'decision-1',
          title: 'Adotar RabbitMQ para eventos',
          context: 'A disciplina exige broker para processamento assíncrono.',
          decision: 'Usar RabbitMQ no ambiente de apresentação.',
          reason: 'Aumenta aderência à arquitetura corporativa.',
          department: 'TI',
          departmentId: 'department-ti',
          impact: 'high',
          status: 'approved',
          active: true,
          createdAt: '2026-05-28T10:00:00.000Z',
          updatedAt: '2026-05-28T10:00:00.000Z',
          user: {
            id: 'user-admin',
            name: 'Jamille Admin',
            role: 'admin',
          },
        },
        {
          id: 'decision-2',
          title: 'Revisar documentação final',
          context: 'O relatório técnico será finalizado ao fim do projeto.',
          decision: 'Manter documentação em evolução.',
          reason: 'Evita retrabalho enquanto o sistema muda.',
          department: 'Gestão',
          departmentId: 'department-gestao',
          impact: 'medium',
          status: 'pending',
          active: true,
          createdAt: '2026-05-27T10:00:00.000Z',
          updatedAt: '2026-05-27T10:00:00.000Z',
          user: {
            id: 'user-admin',
            name: 'Jamille Admin',
            role: 'admin',
          },
        },
      ]),
    })
  })

  await page.route(`${apiBase}/departments**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'department-ti',
          name: 'TI',
          active: true,
          createdAt: '2026-05-28T10:00:00.000Z',
          updatedAt: '2026-05-28T10:00:00.000Z',
        },
        {
          id: 'department-gestao',
          name: 'Gestão',
          active: true,
          createdAt: '2026-05-28T10:00:00.000Z',
          updatedAt: '2026-05-28T10:00:00.000Z',
        },
      ]),
    })
  })

  await page.route(`${apiBase}/health`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        service: 'DecisionLog API',
        checks: {
          api: 'ok',
          mysql: 'ok',
          mongodb: 'ok',
          events: {
            mode: 'rabbitmq',
            state: 'closed',
            failureCount: 0,
            lastFailureAt: null,
            publishedEvents: 2,
          },
        },
      }),
    })
  })

  await page.route(`${apiBase}/audit-logs**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'audit-1',
          action: 'DECISION_UPDATED',
          userId: 'user-admin',
          details: {
            decisionId: 'decision-1',
            estadoAnterior: { status: 'pending' },
            estadoNovo: { status: 'approved' },
          },
          timestamp: '2026-05-28T11:00:00.000Z',
        },
      ]),
    })
  })

  await page.route(`${apiBase}/users**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'user-admin',
          name: 'Jamille Admin',
          email: 'admin@decisionlog.local',
          phone: '(11) 99999-0000',
          preferredTheme: 'light',
          departmentId: 'department-ti',
          department: { id: 'department-ti', name: 'TI', active: true },
          role: 'admin',
          active: true,
          createdAt: '2026-05-28T10:00:00.000Z',
        },
      ]),
    })
  })
}

async function login(page: Page) {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Transforme decisões importantes/ })).toBeVisible()
  await page.getByRole('button', { name: 'Acessar plataforma' }).click()
  await page.getByLabel('E-mail').fill('admin@decisionlog.local')
  await page.getByRole('textbox', { name: 'Senha' }).fill('DecisionLog@26')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Visão Geral Estratégica' })).toBeVisible()
}

test('mostra dashboard corporativo com indicadores executivos', async ({ page }) => {
  await login(page)

  await expect(page.getByText('Usuários Ativos')).toBeVisible()
  await expect(page.getByText('Controle executivo')).toBeVisible()
  await expect(page.getByText('Volume de Decisões por Departamento')).toBeVisible()
  await expect(page.getByText('Adotar RabbitMQ para eventos')).not.toBeVisible()
})

test('landing pública mostra proposta corporativa sem detalhes internos sensíveis', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await expect(page.getByText('Transforme decisões importantes em registros claros, seguros e fáceis de acompanhar.')).toBeVisible()
  await expect(page.getByText('Registre a decisão')).toBeVisible()
  await expect(page.getByText('Prévia ilustrativa')).toBeVisible()
  await expect(page.getByText('suporte@decisionlog.com')).toBeVisible()
  await expect(page.getByText('MySQL')).toHaveCount(0)
  await expect(page.getByText('RabbitMQ')).toHaveCount(0)
})

test('permite abrir cadastro público de empresa e enviar primeiro administrador', async ({ page }) => {
  let requestedPayload: Record<string, unknown> | null = null
  await mockApi(page)
  await page.route(`${apiBase}/auth/register-company`, async (route) => {
    requestedPayload = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify({
        message: 'Empresa cadastrada. Faça login com o administrador criado.',
      }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Cadastrar empresa' }).click()

  await expect(page.getByRole('heading', { name: 'Cadastrar empresa' })).toBeVisible()
  await page.getByLabel('Empresa').fill('AESA')
  await page.getByLabel('Nome').fill('Jamille AESA')
  await page.getByLabel('E-mail').fill('2024130015@aesa-cesa.br')
  await page.getByRole('textbox', { name: 'Senha' }).fill('DecisionLog@26')
  await page.getByLabel(/Li e aceito/).check()
  await page.getByLabel(/Autorizo o tratamento/).check()
  await page.getByRole('button', { name: 'Cadastrar empresa' }).click()

  await expect(page.getByRole('heading', { name: 'Entrar na plataforma' })).toBeVisible()
  expect(requestedPayload).toMatchObject({
    companyName: 'AESA',
    email: '2024130015@aesa-cesa.br',
  })
})

test('mostra ajuda e sair somente no menu da bolinha de perfil', async ({ page }) => {
  await login(page)

  await expect(page.getByRole('button', { name: 'Ajuda e sobre o sistema' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Abrir ajustes de perfil' }).click({ force: true })

  await expect(page.getByRole('button', { name: 'Ajuda e sobre o sistema' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajuda e sobre o sistema' }).click()
  await expect(page.getByRole('heading', { name: 'Ajuda e Sobre o Sistema' })).toBeVisible()
})

test('organiza meu perfil em blocos e separa preferências de visualização', async ({ page }) => {
  await login(page)

  await page.getByRole('button', { name: 'Abrir ajustes de perfil' }).click({ force: true })
  await page.getByRole('button', { name: 'Ajustes de perfil', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Meu Perfil' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Informações de contato' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'E-mail de acesso' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alterar senha' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Preferências de visualização' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escuro' })).toBeVisible()
})
