# Sistema de Alarme Residencial IoT

Painel web de um alarme residencial. Quando uma presença é detectada, o sistema registra o evento (com foto) e o usuário, pelo painel, decide o que fazer: acionar o alarme, solicitar ajuda ou ignorar.

Projeto acadêmico de Engenharia de Software. A parte física (ESP32 + câmera) **não faz parte da entrega**: o hardware é simulado e toda a comunicação passa pelo **Supabase**.

## Equipe

| Integrante | Papel |
|---|---|
| Levi Matheus | Líder |
| Caio Santos | Vice-líder |
| Ezequiel | Integrante |
| Vinicius Batista | Integrante |
| Matheus Alcantara Silva | Integrante |

## Como funciona

```
[Dispositivo simulado] ──INSERT──▶ [Supabase] ──Realtime──▶ [Painel Casa Segura]
 (botão "Simular evento")          banco + Auth              alerta aparece na hora
```

O Supabase não distingue quem escreve nele. No projeto real, o ESP32 faria o mesmo `INSERT` que hoje o botão de simulação faz, então o hardware pode entrar depois sem alterar o painel.

## Funcionalidades

- Login com Supabase Auth (e-mail e senha)
- Tela **Início**: status do sistema, último alerta e eventos recentes
- Tela **Alertas**: eventos pendentes de ação
- Tela **Câmera**: última imagem registrada
- Tela **Histórico**: todos os eventos, do mais recente ao mais antigo
- Tela **Configurações**: ativar/desativar o monitoramento e simular eventos
- Ações sobre um alerta: acionar alarme (com confirmação), solicitar ajuda ou ignorar
- Atualização em tempo real (Supabase Realtime), sem recarregar a página
- Layout responsivo, com menu em gaveta no celular
- **Modo demo**: sem configurar o Supabase, o site roda com dados locais e sem login

> **Observação:** "Acionar alarme" e "Solicitar ajuda" registram a ação no banco. Como não há dispositivo físico, nenhum alarme real é disparado.

## Tecnologias

HTML5 · CSS3 · JavaScript (puro) · [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime) · GitHub Pages

## Estrutura

```
casa-segura/
├── index.html          # painel
├── css/style.css       # visual
├── js/
│   ├── config.js       # URL e chave anon do Supabase
│   └── script.js       # lógica do painel
├── supabase/
│   └── schema.sql      # tabelas, RLS, Realtime e dados de exemplo
└── README.md
```

## Como rodar

### 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode o conteúdo de `supabase/schema.sql`.
3. Em **Authentication → Users**, crie um usuário (e-mail e senha).
4. Em **Authentication → Providers → Email**, desative *Allow new users to sign up*.

### 2. Conectar o painel

Em `js/config.js`, preencha com os dados de **Project Settings → API**:

```js
window.SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
window.SUPABASE_ANON_KEY = "SUA_CHAVE_ANON";
```

Use **somente** a chave `anon`. Nunca coloque a `service_role` no repositório.

### 3. Abrir

Abra o `index.html` no navegador (ou use a extensão *Live Server* do VS Code), faça login e use **Configurações → Simular evento** para gerar um alerta.

## Publicação (GitHub Pages)

1. Envie o projeto para um repositório, com o `index.html` na raiz.
2. Em **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`.
3. No Supabase, em **Authentication → URL Configuration**, informe a URL do site publicado.

## Segurança

- O banco usa **Row Level Security**: somente usuários autenticados leem e alteram os dados. Como a chave `anon` é visível no navegador, é o RLS que protege o banco.
- O cadastro público de usuários deve ficar **desativado**.
- Textos vindos do banco são escapados antes de entrar na página (prevenção de XSS) e só são aceitas imagens `https://` ou `data:image`.

## Banco de dados

**`eventos`**: `id`, `criado_em`, `evento`, `local`, `camera`, `acao` (`necessaria`, `ignorado`, `verificado`, `alarme`, `ajuda`), `imagem`

**`configuracoes`**: `id` (sempre 1), `monitoramento`

## Limitações atuais e próximos passos

- [ ] Página `camera.html` para simular o dispositivo (foto + registro do evento) em outro aparelho
- [ ] Upload de foto no Supabase Storage
- [ ] Etapa de confirmação de presença (pessoa conhecida / desconhecida) antes das ações
- [ ] Notificação no navegador ao receber um novo alerta
- [ ] Integração com o ESP32 real (fora do escopo desta entrega)
