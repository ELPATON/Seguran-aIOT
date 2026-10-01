/* =====================================================
   SCRIPT.JS - comportamento do site (Supabase + modo demo)
   ===================================================== */

const MODO_DEMO = !window.SUPABASE_URL || window.SUPABASE_URL.startsWith("COLE");
const db = MODO_DEMO ? null : window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

let eventos = [];            // sempre ordenados do mais novo pro mais velho
let monitoramento = true;

const acoes = {
  necessaria: { texto: "Ação necessária",  cor: "vermelho" },
  ignorado:   { texto: "Ignorado",         cor: "cinza" },
  verificado: { texto: "Verificado",       cor: "verde" },
  alarme:     { texto: "Alarme acionado",  cor: "vermelho" },
  ajuda:      { texto: "Ajuda solicitada", cor: "vermelho" }
};
const acaoDe = (e) => acoes[e.acao] || { texto: e.acao, cor: "cinza" };

/* ---------- utilidades ---------- */
function esc(t) {  // evita XSS: transforma < > & " ' em texto seguro
  return String(t ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function urlSegura(u) {  // só aceita https, data:image ou arquivos da pasta img/
  return /^(https:\/\/|data:image\/|img\/[\w.-]+$)/.test(u || "") ? u : "";
}
const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR");
const horaBR = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const $ = (id) => document.getElementById(id);

/* ---------- desenho das telas ---------- */
function montarLinhas(lista) {
  return lista.map((e) => {
    const a = acaoDe(e);
    return `<tr>
      <td>${dataBR(e.criado_em)}</td><td>${horaBR(e.criado_em)}</td>
      <td>${esc(e.evento)}</td><td>${esc(e.local)}</td>
      <td class="${a.cor}">${esc(a.texto)}</td></tr>`;
  }).join("");
}

function desenharUltimoAlerta() {
  const pendentes = eventos.filter((e) => e.acao === "necessaria");
  const e = pendentes[0];
  if (!e) { $("ultimo-alerta").innerHTML = "<p>Nenhum alerta pendente.</p>"; return; }

  const img = urlSegura(e.imagem);
  const foto = img ? `<img src="${esc(img)}" alt="Foto do alerta">` : `<div class="sem-foto"></div>`;
  const outros = pendentes.length > 1 ? `<p class="cinza">+ ${pendentes.length - 1} alerta(s) pendente(s) na aba Alertas</p>` : "";

  $("ultimo-alerta").innerHTML = `${foto}
    <div class="alerta-info">
      <p><strong>${esc(e.evento)}</strong></p>
      <p>Local: ${esc(e.local)}</p>
      <p>Horário: ${dataBR(e.criado_em)} - ${horaBR(e.criado_em)}</p>
      <p>Câmera: ${esc(e.camera)}</p>${outros}
      <div class="botoes">
        <button class="perigo" data-id="${e.id}" data-acao="alarme">Acionar alarme</button>
        <button data-id="${e.id}" data-acao="ajuda">Solicitar ajuda</button>
        <button data-id="${e.id}" data-acao="ignorado">Ignorar</button>
      </div>
    </div>`;
}

function desenharListaAlertas() {
  const pend = eventos.filter((e) => e.acao === "necessaria");
  $("lista-alertas").innerHTML = pend.length
    ? pend.map((e) => `<p><strong>${esc(e.evento)}</strong> - ${esc(e.local)} - ${dataBR(e.criado_em)} ${horaBR(e.criado_em)}</p>`).join("")
    : "<p>Nenhum alerta pendente.</p>";
}

function desenharCamera() {
  const e = eventos.find((ev) => urlSegura(ev.imagem));
  $("camera-box").innerHTML = e
    ? `<p>Última imagem da ${esc(e.camera)} (${dataBR(e.criado_em)} ${horaBR(e.criado_em)})</p><img class="camera-img" src="${esc(urlSegura(e.imagem))}" alt="Última imagem da câmera">`
    : "<p>Nenhuma imagem recebida ainda.</p>";
}

function desenharStatus() {
  const s = $("status-sistema");
  s.textContent = monitoramento ? "Ativo" : "Desativado";
  s.className = monitoramento ? "verde" : "cinza";
  $("desc-sistema").textContent = monitoramento ? "Monitoramento funcionando normalmente." : "Monitoramento desativado.";
  $("chk-monitoramento").checked = monitoramento;
}

function desenharTudo() {
  $("tabela-recentes").innerHTML = montarLinhas(eventos.slice(0, 5));
  $("tabela-historico").innerHTML = montarLinhas(eventos);
  desenharUltimoAlerta();
  desenharListaAlertas();
  desenharCamera();
  desenharStatus();
}

/* ---------- dados (Supabase ou demo) ---------- */
function dadosDemo() {
  const h = (horas) => new Date(Date.now() - horas * 3600e3).toISOString();
  return [
    { id: 1, criado_em: h(3),  evento: "Pessoa detectada",    local: "Sala de estar", camera: "CAM-01", acao: "necessaria", imagem: "" },
    { id: 2, criado_em: h(26), evento: "Movimento detectado", local: "Garagem",       camera: "CAM-01", acao: "ignorado",   imagem: "" },
    { id: 3, criado_em: h(50), evento: "Acesso autorizado",   local: "Entrada",       camera: "CAM-01", acao: "verificado", imagem: "" }
  ];
}

async function carregarEventos() {
  if (MODO_DEMO) { if (!eventos.length) eventos = dadosDemo(); return desenharTudo(); }
  const { data, error } = await db.from("eventos").select("*").order("criado_em", { ascending: false });
  if (error) return mostrarErro("Erro ao carregar eventos: " + error.message);
  eventos = data;
  desenharTudo();
}

async function carregarConfig() {
  if (MODO_DEMO) return;
  const { data } = await db.from("configuracoes").select("monitoramento").eq("id", 1).single();
  if (data) monitoramento = data.monitoramento;
}

function mostrarErro(msg) { $("msg-config").textContent = msg; console.error(msg); }

async function agir(id, novaAcao) {
  const e = eventos.find((ev) => ev.id === id);
  if (!e) return;
  if (novaAcao === "alarme" && !confirm("Acionar o alarme?")) return;

  if (MODO_DEMO) { e.acao = novaAcao; return desenharTudo(); }
  const { error } = await db.from("eventos").update({ acao: novaAcao }).eq("id", id);
  if (error) return mostrarErro("Erro ao salvar ação: " + error.message);
  await carregarEventos();
}

async function simularEvento() {
  if (!monitoramento) { $("msg-config").textContent = "Ative o monitoramento para simular eventos."; return; }
  const tipos = ["Pessoa detectada", "Movimento detectado", "Porta aberta"];
  const locais = ["Sala de estar", "Garagem", "Entrada", "Quintal"];
  const fotos = ["img/imagem1.png", "img/imagem2.jpg"];
  const novo = {
    evento: tipos[Math.floor(Math.random() * tipos.length)],
    local: locais[Math.floor(Math.random() * locais.length)],
    camera: "CAM-01", acao: "necessaria",
    imagem: fotos[Math.floor(Math.random() * fotos.length)]
  };
  $("msg-config").textContent = "";
  if (MODO_DEMO) {
    eventos.unshift({ id: Date.now(), criado_em: new Date().toISOString(), ...novo });
    return desenharTudo();
  }
  const { error } = await db.from("eventos").insert(novo);
  if (error) return mostrarErro("Erro ao criar evento: " + error.message);
  await carregarEventos();
  $("msg-config").textContent = "Evento criado! Veja em Início.";
}

async function alternarMonitoramento(ligado) {
  monitoramento = ligado;
  desenharStatus();
  if (MODO_DEMO) return;
  const { error } = await db.from("configuracoes").update({ monitoramento: ligado }).eq("id", 1);
  if (error) mostrarErro("Erro ao salvar configuração: " + error.message);
}

function assinarTempoReal() {
  if (MODO_DEMO) return;
  db.channel("eventos-mudancas")
    .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, carregarEventos)
    .subscribe();
}

/* ---------- navegação ---------- */
function mostrarTela(nome) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.add("escondida"));
  $("tela-" + nome).classList.remove("escondida");
  document.querySelectorAll(".menu nav a").forEach((l) => l.classList.toggle("ativo", l.dataset.tela === nome));
  $("menu").classList.remove("aberto");
}

document.querySelectorAll(".menu nav a").forEach((link) =>
  link.addEventListener("click", (ev) => { ev.preventDefault(); mostrarTela(link.dataset.tela); }));
$("btn-menu").addEventListener("click", () => $("menu").classList.toggle("aberto"));

// um único "ouvinte" para todos os botões de ação (em vez de onclick inline)
$("ultimo-alerta").addEventListener("click", (ev) => {
  const b = ev.target.closest("button[data-id]");
  if (b) agir(Number(b.dataset.id), b.dataset.acao);
});
$("btn-simular").addEventListener("click", simularEvento);
$("chk-monitoramento").addEventListener("change", (ev) => alternarMonitoramento(ev.target.checked));

/* ---------- login ---------- */
$("form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const { error } = await db.auth.signInWithPassword({ email: $("login-email").value, password: $("login-senha").value });
  $("login-erro").textContent = error ? "E-mail ou senha incorretos." : "";
  if (!error) iniciarApp();
});

$("btn-sair").addEventListener("click", async (ev) => {
  ev.preventDefault();
  if (!MODO_DEMO) await db.auth.signOut();
  location.reload();
});

async function iniciarApp() {
  $("login").classList.add("escondida");
  $("app").classList.remove("escondida");
  if (MODO_DEMO) { $("usuario").textContent = "Modo demonstração"; }
  else {
    const { data } = await db.auth.getUser();
    $("usuario").textContent = "Usuário: " + (data.user?.email || "");
  }
  await carregarConfig();
  await carregarEventos();
  assinarTempoReal();
}

async function iniciar() {
  if (MODO_DEMO) return iniciarApp();
  const { data } = await db.auth.getSession();
  if (data.session) iniciarApp(); else $("login").classList.remove("escondida");
}
iniciar();