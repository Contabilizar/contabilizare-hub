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

/**
 * Obtém a lista de funcionários cadastrados.
 */
export async function obterFuncionarios() {
  const r = await fetch(`${API_BASE}/employees`);
  if (!r.ok) throw new Error("Falha ao obter funcionários");
  return r.json();
}

/**
 * Cadastra um novo funcionário.
 */
export async function cadastrarFuncionario(dados) {
  const r = await fetch(`${API_BASE}/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao cadastrar funcionário");
  return r.json();
}

/**
 * Atualiza os dados de um funcionário.
 */
export async function atualizarFuncionario(id, dados) {
  const r = await fetch(`${API_BASE}/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao atualizar funcionário");
  return r.json();
}

/**
 * Remove um funcionário.
 */
export async function excluirFuncionario(id) {
  const r = await fetch(`${API_BASE}/employees/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) throw new Error("Erro ao excluir funcionário");
  return r.json();
}

/**
 * Busca os dados de período de todas as empresas de um determinado mês.
 */
export async function obterPeriodosDoMes(periodo) {
  const r = await fetch(`${API_BASE}/periods/${periodo}`);
  if (!r.ok) throw new Error("Erro ao carregar dados do período");
  return r.json();
}

/**
 * ==================== ROTAS DE CONTROLE DE ESTOQUE ====================
 */

export async function obterProdutosEstoque() {
  const r = await fetch(`${API_BASE}/stock/products`);
  if (!r.ok) throw new Error("Erro ao carregar produtos do estoque");
  return r.json();
}

export async function cadastrarProdutoEstoque(dados) {
  const r = await fetch(`${API_BASE}/stock/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao cadastrar produto no estoque");
  return r.json();
}

export async function atualizarProdutoEstoque(id, dados) {
  const r = await fetch(`${API_BASE}/stock/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao atualizar produto do estoque");
  return r.json();
}

export async function excluirProdutoEstoque(id) {
  const r = await fetch(`${API_BASE}/stock/products/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) throw new Error("Erro ao excluir produto do estoque");
  return r.json();
}

export async function obterMovimentacoesEstoque() {
  const r = await fetch(`${API_BASE}/stock/transactions`);
  if (!r.ok) throw new Error("Erro ao carregar movimentações do estoque");
  return r.json();
}

export async function cadastrarMovimentacaoEstoque(dados) {
  const r = await fetch(`${API_BASE}/stock/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao registrar movimentação no estoque");
  }
  return r.json();
}

export async function excluirMovimentacaoEstoque(tipo, id) {
  const r = await fetch(`${API_BASE}/stock/transactions/${tipo}/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao desfazer movimentação do estoque");
  }
  return r.json();
}

export async function obterLocaisEstoque() {
  const r = await fetch(`${API_BASE}/stock/locations`);
  if (!r.ok) throw new Error("Erro ao carregar locais de estoque");
  return r.json();
}

export async function obterFuncionariosEstoque() {
  const r = await fetch(`${API_BASE}/stock/employees`);
  if (!r.ok) throw new Error("Erro ao carregar funcionários do estoque");
  return r.json();
}

export async function conversarComZareEstoque(message, history, provider, apiKey) {
  const r = await fetch(`${API_BASE}/stock/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      provider,
      api_key: apiKey
    })
  });
  if (!r.ok) throw new Error("Erro ao conversar com a assistente de estoque");
  return r.json();
}

export async function parseComandosEstoque(text) {
  const r = await fetch(`${API_BASE}/stock/parse-commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error("Erro ao interpretar comandos da assistente");
  return r.json();
}

export async function executarComandosEstoque(commands) {
  const r = await fetch(`${API_BASE}/stock/execute-commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!r.ok) throw new Error("Erro ao executar comandos de estoque");
  return r.json();
}


/**
 * ==================== ROTAS DE CONFIGURAÇÃO DE ESTOQUE ====================
 */

export async function obterConfigCategorias() {
  const r = await fetch(`${API_BASE}/stock/config/categories`);
  if (!r.ok) throw new Error("Erro ao carregar categorias");
  return r.json();
}

export async function cadastrarConfigCategoria(dados) {
  const r = await fetch(`${API_BASE}/stock/config/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao cadastrar categoria");
  return r.json();
}

export async function excluirConfigCategoria(id) {
  const r = await fetch(`${API_BASE}/stock/config/categories/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) throw new Error("Erro ao excluir categoria");
  return r.json();
}

export async function obterConfigLocais() {
  const r = await fetch(`${API_BASE}/stock/config/locations`);
  if (!r.ok) throw new Error("Erro ao carregar locais");
  return r.json();
}

export async function cadastrarConfigLocal(dados) {
  const r = await fetch(`${API_BASE}/stock/config/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao cadastrar local");
  return r.json();
}

export async function excluirConfigLocal(id) {
  const r = await fetch(`${API_BASE}/stock/config/locations/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) throw new Error("Erro ao excluir local");
  return r.json();
}

export async function obterConfigFuncionarios() {
  const r = await fetch(`${API_BASE}/stock/config/employees`);
  if (!r.ok) throw new Error("Erro ao carregar colaboradores");
  return r.json();
}

export async function cadastrarConfigFuncionario(dados) {
  const r = await fetch(`${API_BASE}/stock/config/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error("Erro ao cadastrar colaborador");
  return r.json();
}

export async function excluirConfigFuncionario(id) {
  const r = await fetch(`${API_BASE}/stock/config/employees/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) throw new Error("Erro ao excluir colaborador");
  return r.json();
}

/**
 * ==================== ROTAS DE GERENCIAMENTO DE CERTIFICADOS ====================
 */

export async function obterCertificadosCNPJ(query = "") {
  const r = await fetch(`${API_BASE}/certificates/cnpj?query=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error("Erro ao obter certificados CNPJ");
  return r.json();
}

export async function obterCertificadosCPF(query = "") {
  const r = await fetch(`${API_BASE}/certificates/cpf?query=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error("Erro ao obter certificados CPF");
  return r.json();
}

export async function excluirCertificado(tabela, id) {
  const r = await fetch(`${API_BASE}/certificates/${tabela}/${id}`, {
    method: "DELETE"
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao excluir certificado");
  }
  return r.json();
}

export async function uploadCertificado(file, password) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);

  const r = await fetch(`${API_BASE}/certificates/upload`, {
    method: "POST",
    body: formData
  });

  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao fazer upload do certificado");
  }
  return r.json();
}

export function obterDownloadCertificadoUrl(tabela, id) {
  return `${API_BASE}/certificates/download/${tabela}/${id}`;
}

export async function instalarCertificadoNoSO(tabela, id) {
  const r = await fetch(`${API_BASE}/certificates/install/${tabela}/${id}`, {
    method: "POST"
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao instalar certificado no Windows");
  }
  return r.json();
}

export async function abrirPastaCertificado(tabela, id) {
  const r = await fetch(`${API_BASE}/certificates/open-folder/${tabela}/${id}`, {
    method: "POST"
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao abrir pasta do certificado");
  }
  return r.json();
}

export async function obterCertificadosInstaladosNoSO() {
  const r = await fetch(`${API_BASE}/certificates/installed`);
  if (!r.ok) throw new Error("Erro ao obter certificados instalados no Windows");
  return r.json();
}

export async function desinstalarCertificadoNoSO(thumbprint) {
  const r = await fetch(`${API_BASE}/certificates/installed/${thumbprint}`, {
    method: "DELETE"
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.detail || "Erro ao desinstalar certificado do Windows");
  }
  return r.json();
}

export function obterHelperScriptUrl() {
  return `${API_BASE}/certificates/helper/script`;
}

export function obterHelperRegUrl() {
  return `${API_BASE}/certificates/helper/reg`;
}
