// Cliente de API para o Frontend do Hub Contabilizare
// Conecta o painel React (App.jsx) ao backend local FastAPI

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * Obtém a lista de empresas cadastradas no banco de dados SQLite.
 */
export async function obterEmpresas() {
  const r = await fetch(`${API_BASE}/registry`);
  if (!r.ok) throw new Error("Falha ao carregar empresas");
  return r.json();
}

/**
 * Cadastra uma nova empresa no banco de dados centralizado.
 */
export async function cadastrarEmpresa(dadosEmpresa) {
  const r = await fetch(`${API_BASE}/registry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosEmpresa)
  });
  if (!r.ok) throw new Error("Erro ao cadastrar empresa");
  return r.json();
}

/**
 * Salva/Atualiza o cadastro de uma empresa específica.
 */
export async function atualizarEmpresa(id, dadosEmpresa) {
  const r = await fetch(`${API_BASE}/registry/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosEmpresa)
  });
  if (!r.ok) throw new Error("Erro ao atualizar empresa");
  return r.json();
}

/**
 * Remove o cadastro de uma empresa e suas fichas associadas.
 */
export async function excluirEmpresa(id) {
  const r = await fetch(`${API_BASE}/registry/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) throw new Error("Erro ao excluir empresa");
  return r.json();
}

/**
 * Obtém o histórico de logs/ações do sistema.
 */
export async function obterLogs() {
  const r = await fetch(`${API_BASE}/logs`);
  if (!r.ok) throw new Error("Falha ao obter histórico de logs");
  return r.json();
}

/**
 * Busca as informações de faturamento e obrigações (Ficha) de uma empresa e período.
 */
export async function obterFichaPeriodo(periodo, empresaId) {
  const r = await fetch(`${API_BASE}/periods/${periodo}/${empresaId}`);
  if (!r.ok) throw new Error("Erro ao buscar dados do período");
  return r.json();
}

/**
 * Salva as informações de faturamento e obrigações (Ficha) de uma empresa e período.
 */
export async function salvarFichaPeriodo(periodo, empresaId, dadosFicha) {
  const r = await fetch(`${API_BASE}/periods/${periodo}/${empresaId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosFicha)
  });
  if (!r.ok) throw new Error("Erro ao salvar dados do período");
  return r.json();
}

/**
 * Envia uma mensagem para o Chat da Assistente Zare.
 * A API processa a mensagem, executa comandos no banco e retorna a resposta de voz/texto.
 */
export async function conversarComZare(message, history, provider, apiKey, period) {
  const r = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      provider,
      api_key: apiKey,
      period
    })
  });
  if (!r.ok) throw new Error("Falha ao conversar com a assistente");
  return r.json();
}
