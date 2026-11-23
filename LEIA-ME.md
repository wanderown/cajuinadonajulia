# Cajuína Dona Júlia — Sistema de gestão

Pedidos, espelho, produção por lote, estoque, clientes no mapa, rotas, entregas em tempo real, feira offline, financeiro, equipe com permissões e área do cliente.

## Subir no Railway (tudo pelo navegador)
1. GitHub → **New repository** (ex.: `cajuina-sistema`) → **Add file › Upload files** → arraste o conteúdo desta pasta (não a pasta, o que tem dentro) → Commit.
2. Railway → **New Project › Deploy from GitHub repo** → escolha o repositório.
3. No serviço: **Settings › Volumes › Add volume**, mount path `/data`.
4. **Variables**:
   - `CAJU_DATA` = `/data`
   - `CAJU_DEMO` = `1` (sobe com dados fictícios; use `0` para começar limpo)
   - `CAJU_TZ` = `America/Fortaleza` (padrão, opcional)
5. **Settings › Networking › Generate Domain**. Pronto.

Área da equipe: `https://SEU-DOMINIO/` · Área do cliente: `https://SEU-DOMINIO/cliente`

## Acessos da demonstração
Entra com **usuário, e-mail ou CPF + senha**.

| Quem | Usuário | Senha | Vê |
|---|---|---|---|
| Lira (dono) | `lira` | `1234` | tudo |
| Ana · vendas | `ana` | `1111` | pedidos, clientes, rotas (desconto até 5%) |
| Zé · produção | `ze` | `2222` | produção, lotes, estoque |
| João · entregas | `joao` | `3333` | tela de entregador no celular com GPS |
| Caixa da feira | `feira` | `4444` | só o caixa de feira (funciona offline) |

Quem já usava o sistema com PIN: o usuário é o primeiro nome (sem acento) e a senha é o PIN antigo. Troque em **Conta › Trocar minha senha**.

### Recuperar senha (código por e-mail e WhatsApp)
- **E-mail:** configure no Railway as variáveis abaixo (exemplo Gmail com "senha de app"):
  - `CAJU_SMTP_HOST` = `smtp.gmail.com`
  - `CAJU_SMTP_PORT` = `587`
  - `CAJU_SMTP_USER` = `seuemail@gmail.com`
  - `CAJU_SMTP_PASS` = `senha de app de 16 letras`
  - `CAJU_SMTP_FROM` = `Cajuína Dona Júlia <seuemail@gmail.com>`
- **WhatsApp automático:** só com a API oficial do WhatsApp (token em Configurações). Sem ela, o administrador usa **Equipe › Editar › Gerar código de acesso** e manda pelo botão do WhatsApp.
- **Modo demonstração:** o código aparece na própria tela.

**Cliente de teste:** telefone `(86) 90000-0001` (Empório Sertão Vivo). No modo demo o código de 6 dígitos aparece na tela.

## Roteiro de apresentação (10 min)
1. **Painel** (Lira): vendas do mês, margem, a receber, alertas (lote vencendo, insumo baixo, cliente atrasado).
2. **Pedidos**: kanban → "+ Novo pedido" → cliente revendedor puxa tabela e frete da rota sozinho → abrir pedido → **Espelho** (PDF com Pix e lote de cada item).
3. **Produção**: lote novo baixa insumos da ficha técnica → **Rastreio** do lote mostra para quem cada garrafa foi.
4. **Clientes › Mapa** e **Rotas**: romaneio impresso, rota no Google Maps, entregador ao vivo no mapa.
5. Entrar como **João (3333)** no celular: entregas do dia, foto do canhoto, receber.
6. Entrar como **Ana (1111)**: menu reduzido, desconto limitado → mostrar **Equipe › permissões** e o log.
7. **Feira**: venda rápida, cai a internet e continua vendendo.
8. **Área do cliente** no celular: repetir último pedido, acompanhar, copiar Pix.
9. **Financeiro**: a receber, a pagar, resultado (DRE).

## Antes de usar de verdade
- **Configurações › Sistema › Apagar dados de demonstração** (digite APAGAR). Mantém produtos, preços, rotas e equipe; apaga clientes, pedidos, lotes e movimentos fictícios.
- Troque os PINs na tela **Equipe** e cadastre a chave Pix real em **Configurações › Empresa**.
- Revise os preços em **Configurações** (matriz de preços): os valores da demo são ilustrativos.

## Observações
- Todos os clientes, telefones, valores e a chave Pix da demo são **fictícios**.
- O mapa usa OpenStreetMap: precisa de internet (não funciona offline).
- Envio automático do código do cliente por WhatsApp só com API configurada; sem ela, a equipe gera o código em **Clientes › ficha** e manda pelo link do WhatsApp.
- Espelho e romaneio não são documento fiscal.
- Backup: **Configurações › Sistema › Baixar backup** (arquivo do banco).
