import { useState, useEffect, useMemo } from "react";
import { 
  Pencil, Trash2, Plus, Search, Download, Printer, Loader, 
  AlertCircle, Clock, ArrowUp, ArrowDown, ClipboardList, Lock, Package
} from "lucide-react";

import { 
  obterProdutosEstoque, 
  cadastrarProdutoEstoque, 
  atualizarProdutoEstoque, 
  excluirProdutoEstoque, 
  obterMovimentacoesEstoque, 
  cadastrarMovimentacaoEstoque, 
  excluirMovimentacaoEstoque, 
  obterLocaisEstoque, 
  obterFuncionariosEstoque, 
  conversarComZareEstoque, 
  parseComandosEstoque, 
  executarComandosEstoque, 
  obterConfigCategorias, 
  cadastrarConfigCategoria, 
  excluirConfigCategoria, 
  obterConfigLocais, 
  cadastrarConfigLocal, 
  excluirConfigLocal, 
  obterConfigFuncionarios, 
  cadastrarConfigFuncionario, 
  excluirConfigFuncionario 
} from "./api";

// Constantes de Cores (C) e Utilitários locais para o Estoque
const C = {
  navy: "#16224a",
  navySoft: "#eef1f8",
  navyDeep: "#0c1640",
  card: "#ffffff",
  line: "#e8eaef",
  bg: "#f8f9fc",
  ink: "#1b2440",
  body: "#414a60",
  muted: "#8a92a0",
  red: "#b91c1c",
  redSoft: "#fee2e2",
  green: "#16a34a",
  greenSoft: "#dcfce7",
  amber: "#d97706",
  amberSoft: "#fef3c7"
};

const money = (n) => 
  (typeof n === "number" ? n : Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function Bar({ pct, w }) {
  const barColor = (p) => (p >= 100 ? C.green : p >= 50 ? C.amber : p > 0 ? C.navy : C.muted);
  return (
    <div style={{ height: 6, width: w || "100%", borderRadius: 4, background: C.line, overflow: "hidden" }}>
      <div style={{ width: Math.max(0, Math.min(100, pct)) + "%", height: "100%", background: barColor(pct), borderRadius: 4, transition: "width .3s" }} />
    </div>
  );
}

function Avatar({ nome, size }) {
  const letters = nome ? nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "US";
  return (
    <div style={{
      width: size || 32, height: size || 32, borderRadius: "50%", background: C.navy, color: "#fff",
      display: "flex", alignItems: "center", justify: "center", justifyContent: "center", fontSize: 13, fontWeight: 700
    }}>
      {letters}
    </div>
  );
}

function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 100);
  const points = data.map((val, idx) => `${idx * 16},${40 - (val / max * 36)}`).join(" ");
  return (
    <svg width="80" height="40" style={{ overflow: "visible" }}>
      <polyline fill="none" stroke={C.navy} strokeWidth="2" points={points} />
      {data.map((val, idx) => (
        <circle key={idx} cx={idx * 16} cy={40 - (val / max * 36)} r="3" fill={C.navy} />
      ))}
    </svg>
  );
}

export default function Estoque({ me, active }) {
  const [activeSubTab, setActiveSubTab] = useState("dashboard"); // "dashboard", "produtos", "entrada", "saida", "fisico", "csv", "diario", "config", "chat"
  
  // Dados principais
  const [produtos, setProdutos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dados de Configurações
  const [configSubTab, setConfigSubTab] = useState("locais"); // "locais", "funcionarios", "categorias"
  const [categoriasConfig, setCategoriasConfig] = useState([]);
  const [locaisConfig, setLocaisConfig] = useState([]);
  const [funcionariosConfig, setFuncionariosConfig] = useState([]);
  const [newConfigName, setNewConfigName] = useState("");
  
  // Modais e Formulários
  const [showAddProd, setShowAddProd] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [prodForm, setProdForm] = useState({ nome: "", categoria: "Geral", estoque_min: 0, preco_custo: 0, preco_venda: 0 });
  const [txForm, setTxForm] = useState({ produto_id: "", tipo: "Entrada", quantidade: 1, local: "", funcionario: "", valor_unitario: 0 });
  
  // Buscas
  const [searchProd, setSearchProd] = useState("");
  const [searchEstoque, setSearchEstoque] = useState("");
  const [searchDiario, setSearchDiario] = useState("");

  // Chat da Zare
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([
    ["model", "Olá! Sou a Zare, sua assistente de controle de estoque. Como posso te ajudar hoje? Você pode me perguntar sobre saldos ou me pedir lançamentos como 'Dei entrada em 10 canetas no Almoxarifado'."]
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [parsedCommands, setParsedCommands] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Carregar dados gerais
  const loadData = async () => {
    try {
      const [prods, txs, locs, emps, catsConf, locsConf, empsConf] = await Promise.all([
        obterProdutosEstoque(),
        obterMovimentacoesEstoque(),
        obterLocaisEstoque(),
        obterFuncionariosEstoque(),
        obterConfigCategorias(),
        obterConfigLocais(),
        obterConfigFuncionarios()
      ]);
      setProdutos(prods);
      setMovimentos(txs);
      setLocais(locs);
      setFuncionarios(emps);
      setCategoriasConfig(catsConf);
      setLocaisConfig(locsConf);
      setFuncionariosConfig(empsConf);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000); // Polling em tempo real a cada 15s
    return () => clearInterval(timer);
  }, []);

  // Cadastro de Produtos
  const handleSaveProd = async (e) => {
    e.preventDefault();
    try {
      if (editingProd) {
        await atualizarProdutoEstoque(editingProd.id, prodForm);
      } else {
        await cadastrarProdutoEstoque(prodForm);
      }
      setProdForm({ nome: "", categoria: "Geral", estoque_min: 0, preco_custo: 0, preco_venda: 0 });
      setShowAddProd(false);
      setEditingProd(null);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProd = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este produto e todo seu histórico?")) return;
    try {
      await excluirProdutoEstoque(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // CSV Import / Export
  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n");
        let importedCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const separator = line.includes(";") ? ";" : ",";
          const cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ""));
          
          if (i === 0 && (cols[0].toLowerCase().includes("nome") || cols[0].toLowerCase().includes("produto") || cols[0].toLowerCase().includes("id"))) {
            continue; // Ignora o cabeçalho
          }
          
          if (cols.length >= 2) {
            const nome = cols[0];
            const categoria = cols[1];
            const minStock = cols.length > 2 ? parseInt(cols[2]) || 0 : 0;
            const precoCusto = cols.length > 3 ? parseFloat(cols[3].replace(",", ".")) || 0.0 : 0.0;
            const precoVenda = cols.length > 4 ? parseFloat(cols[4].replace(",", ".")) || 0.0 : 0.0;
            
            await cadastrarProdutoEstoque({
              nome,
              categoria,
              estoque_min: minStock,
              preco_custo: precoCusto,
              preco_venda: precoVenda
            });
            importedCount++;
          }
        }
        alert(`Sucesso! ${importedCount} produtos importados do CSV.`);
        loadData();
      } catch (err) {
        alert("Erro ao ler arquivo de importação CSV: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleCSVExport = () => {
    try {
      const header = ["ID", "Produto", "Categoria", "Quantidade em Estoque", "Preco Custo", "Preco Venda"];
      const rows = produtos.map(p => [
        p.id,
        `"${p.nome.replace(/"/g, '""')}"`,
        `"${p.categoria.replace(/"/g, '""')}"`,
        p.estoque_atual,
        p.preco_custo.toFixed(2),
        p.preco_venda.toFixed(2)
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [header.join(";"), ...rows.map(e => e.join(";"))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "relatorio_estoque.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Erro ao exportar planilha CSV: " + err.message);
    }
  };

  // Lançamentos Manuais
  const handleLaunchTx = async (e) => {
    e.preventDefault();
    if (!txForm.produto_id) return alert("Selecione um produto");
    try {
      await cadastrarMovimentacaoEstoque({
        produto_id: parseInt(txForm.produto_id),
        tipo: txForm.tipo,
        quantidade: parseInt(txForm.quantidade),
        local: txForm.local,
        funcionario: txForm.funcionario,
        valor_unitario: parseFloat(txForm.valor_unitario)
      });
      setTxForm({ produto_id: "", tipo: "Entrada", quantidade: 1, local: "", funcionario: "", valor_unitario: 0 });
      alert("Lançamento efetuado com sucesso!");
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndoTx = async (tipo, id) => {
    if (!confirm("Deseja realmente estornar/desfazer esta movimentação?")) return;
    try {
      await excluirMovimentacaoEstoque(tipo, id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Configurações CRUD
  const handleAddConfig = async (e) => {
    e.preventDefault();
    if (!newConfigName.trim()) return;
    try {
      if (configSubTab === "locais") {
        await cadastrarConfigLocal({ nome: newConfigName });
      } else if (configSubTab === "funcionarios") {
        await cadastrarConfigFuncionario({ nome: newConfigName });
      } else if (configSubTab === "categorias") {
        await cadastrarConfigCategoria({ nome: newConfigName });
      }
      setNewConfigName("");
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteConfig = async (id) => {
    if (!confirm("Confirmar exclusão deste registro?")) return;
    try {
      if (configSubTab === "locais") {
        await excluirConfigLocal(id);
      } else if (configSubTab === "funcionarios") {
        await excluirConfigFuncionario(id);
      } else if (configSubTab === "categorias") {
        await excluirConfigCategoria(id);
      }
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Chat com a Zare
  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatMsg.trim()) return;

    const userMsg = chatMsg;
    setChatMsg("");
    setChatHistory(prev => [...prev, ["user", userMsg]]);
    setChatLoading(true);

    try {
      const provider = localStorage.getItem("contabilizar:ai_provider") || "gemini";
      const apiKey = localStorage.getItem("contabilizar:ai_key") || "";
      const cleanHistory = chatHistory.map(([role, text]) => [role, text]);

      const res = await conversarComZareEstoque(userMsg, cleanHistory, provider, apiKey);
      setChatHistory(prev => [...prev, ["model", res.response]]);

      const cmds = await parseComandosEstoque(res.response);
      if (cmds && cmds.length > 0) {
        setParsedCommands(cmds);
        setShowConfirmModal(true);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, ["model", "⚠️ Erro ao processar mensagem: " + err.message]]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExecuteCommands = async () => {
    try {
      const res = await executarComandosEstoque(parsedCommands);
      setShowConfirmModal(false);
      setParsedCommands([]);
      loadData();
      
      if (res.logs && res.logs.length > 0) {
        setChatHistory(prev => [...prev, ["model", "🤖 Lançamentos confirmados:\n" + res.logs.map(l => "• " + l).join("\n")]]);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Cálculos do Resumo
  const totalValFinanceiro = produtos.reduce((sum, p) => sum + (p.estoque_atual * p.preco_custo), 0);
  const totalProdutosAbaixoMin = produtos.filter(p => p.estoque_atual < p.estoque_min).length;

  // Filtros de busca
  const filteredProds = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchProd.toLowerCase()) || 
    p.categoria.toLowerCase().includes(searchProd.toLowerCase())
  );

  const filteredEstoque = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchEstoque.toLowerCase()) || 
    p.categoria.toLowerCase().includes(searchEstoque.toLowerCase())
  );

  const filteredMovs = movimentos.filter(m => 
    m.produto_nome.toLowerCase().includes(searchDiario.toLowerCase()) ||
    m.local.toLowerCase().includes(searchDiario.toLowerCase()) ||
    m.funcionario.toLowerCase().includes(searchDiario.toLowerCase())
  );

  const sidebarItems = [
    { key: "dashboard", label: "📊 Painel Resumo" },
    { key: "produtos", label: "📦 Produtos" },
    { key: "entrada", label: "⬆️ Registrar Entrada" },
    { key: "saida", label: "⬇️ Registrar Saída" },
    { key: "fisico", label: "📋 Estoque Físico" },
    { key: "csv", label: "📊 Relatórios CSV" },
    { key: "diario", label: "📘 Diário de Movimentações" },
    { key: "config", label: "⚙️ Configurações" },
    { key: "chat", label: "💬 Assistente Zare" }
  ];

  return (
    <div style={{ display: active ? "flex" : "none", flex: 1, minHeight: 0, gap: 20 }}>
      {/* 1. Menu Lateral do Módulo de Estoque (Igual ao QListWidget) */}
      <div style={{
        width: "220px", 
        borderRight: `1px solid ${C.line}`, 
        display: "flex", 
        flexDirection: "column", 
        gap: 4, 
        paddingRight: 12,
        flexShrink: 0
      }}>
        {sidebarItems.map(item => {
          const active = activeSubTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSubTab(item.key)}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? C.navySoft : "transparent",
                color: active ? C.navy : C.body,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "block",
                width: "100%"
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 2. Área Central de Conteúdo */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "auto" }}>
        
        {/* TELA: PAINEL RESUMO */}
        {activeSubTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Cards de Métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Total de Produtos</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4 }}>{produtos.length}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Valor Financeiro (Custo)</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.green, marginTop: 4 }}>{money(totalValFinanceiro)}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Abaixo da Cota Mínima</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: totalProdutosAbaixoMin > 0 ? C.red : C.ink, marginTop: 4 }}>{totalProdutosAbaixoMin}</div>
              </div>
            </div>

            {/* Painel Duplo */}
            <div style={{ display: "flex", gap: 20 }}>
              {/* Alertas */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, fontWeight: 700, color: C.red, fontSize: 13 }}>
                  ⚠️ Produtos com Estoque Crítico
                </div>
                <div style={{ maxHeight: "250px", overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, textAlign: "left" }}>
                        <th style={{ padding: 10, fontWeight: 600 }}>Produto</th>
                        <th style={{ padding: 10, fontWeight: 600, textAlign: "center" }}>Qtd. Atual</th>
                        <th style={{ padding: 10, fontWeight: 600 }}>Qtd. Mínima</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.filter(p => p.estoque_atual < p.estoque_min).map(p => (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td style={{ padding: 10, fontWeight: 600, color: C.ink }}>{p.nome}</td>
                          <td style={{ padding: 10, textAlign: "center", color: C.red, fontWeight: 700 }}>{p.estoque_atual} un</td>
                          <td style={{ padding: 10, color: C.muted }}>{p.estoque_min} un</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Movimentações Rápidas */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, fontWeight: 700, color: C.navy, fontSize: 13 }}>
                  ⚡ Últimas Movimentações
                </div>
                <div style={{ maxHeight: "250px", overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, textAlign: "left" }}>
                        <th style={{ padding: 10, fontWeight: 600 }}>Operação</th>
                        <th style={{ padding: 10, fontWeight: 600 }}>Produto</th>
                        <th style={{ padding: 10, fontWeight: 600, textAlign: "center" }}>Quantidade</th>
                        <th style={{ padding: 10, fontWeight: 600 }}>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentos.slice(0, 5).map((m, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td style={{ padding: 10 }}>
                            <span style={{ fontWeight: 700, color: m.tipo === "Entrada" ? C.green : C.red }}>
                              {m.tipo === "Entrada" ? "⬆️ Entrada" : "⬇️ Saída"}
                            </span>
                          </td>
                          <td style={{ padding: 10, fontWeight: 500, color: C.ink }}>{m.produto_nome}</td>
                          <td style={{ padding: 10, textAlign: "center", fontWeight: 700 }} className="tnum">{m.quantidade}</td>
                          <td style={{ padding: 10, color: C.muted }} className="tnum">{m.data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TELA: PRODUTOS */}
        {activeSubTab === "produtos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <input
                type="text"
                placeholder="🔍 Buscar produto por nome ou categoria..."
                value={searchProd}
                onChange={e => setSearchProd(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, width: "320px" }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
                  background: C.bg, border: `1px solid ${C.line}`, fontSize: 12.5, fontWeight: 600, cursor: "pointer"
                }}>
                  📥 Importar CSV
                  <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: "none" }} />
                </label>
                <button
                  onClick={() => {
                    setEditingProd(null);
                    setProdForm({ nome: "", categoria: "Geral", estoque_min: 0, preco_custo: 0, preco_venda: 0 });
                    setShowAddProd(true);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
                    background: C.navy, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  <Plus size={15} /> Novo Produto
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}` }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>ID</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Nome do Produto</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Categoria</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Cota Mínima</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Preço Custo</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Preço Venda</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProds.map(p => (
                    <tr key={p.id} className="rowh" style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "12px 16px", color: C.muted }} className="tnum">#{p.id}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: C.ink }}>{p.nome}</td>
                      <td style={{ padding: "12px 16px", color: C.body }}>{p.categoria}</td>
                      <td style={{ padding: "12px 16px" }} className="tnum">{p.estoque_min} un</td>
                      <td style={{ padding: "12px 16px" }} className="tnum">{money(p.preco_custo)}</td>
                      <td style={{ padding: "12px 16px" }} className="tnum">{money(p.preco_venda)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => {
                              setEditingProd(p);
                              setProdForm({ nome: p.nome, categoria: p.categoria, estoque_min: p.estoque_min, preco_custo: p.preco_custo, preco_venda: p.preco_venda });
                              setShowAddProd(true);
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.navy }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProd(p.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.red }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TELA: REGISTRAR ENTRADA */}
        {activeSubTab === "entrada" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            <div style={{ width: "480px", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.navy, borderBottom: `1px solid ${C.line}`, paddingBottom: 10 }}>
                ⬆️ Registrar Entrada de Mercadoria
              </span>
              <form onSubmit={(e) => { txForm.tipo = "Entrada"; handleLaunchTx(e); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Produto</label>
                  <select
                    value={txForm.produto_id}
                    onChange={e => {
                      const selected = produtos.find(p => p.id === parseInt(e.target.value));
                      setTxForm({ ...txForm, produto_id: e.target.value, valor_unitario: selected ? selected.preco_custo : 0 });
                    }}
                    style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                    required
                  >
                    <option value="">Selecione o produto...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={txForm.quantidade}
                      onChange={e => setTxForm({ ...txForm, quantidade: parseInt(e.target.value) || 1 })}
                      style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Valor Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={txForm.valor_unitario}
                      onChange={e => setTxForm({ ...txForm, valor_unitario: parseFloat(e.target.value) || 0.0 })}
                      style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Local / Setor de Destino</label>
                  <input
                    list="locais-list"
                    type="text"
                    placeholder="Ex: Almoxarifado, Recepção"
                    value={txForm.local}
                    onChange={e => setTxForm({ ...txForm, local: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Responsável pelo Recebimento</label>
                  <input
                    list="funcionarios-list"
                    type="text"
                    placeholder="Ex: Amanda Santos"
                    value={txForm.funcionario}
                    onChange={e => setTxForm({ ...txForm, funcionario: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 10, padding: 12, borderRadius: 8, background: C.navy, color: "#fff",
                    border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer"
                  }}
                >
                  Registrar Entrada
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TELA: REGISTRAR SAÍDA */}
        {activeSubTab === "saida" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            <div style={{ width: "480px", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.navy, borderBottom: `1px solid ${C.line}`, paddingBottom: 10 }}>
                ⬇️ Registrar Saída / Retirada de Mercadoria
              </span>
              <form onSubmit={(e) => { txForm.tipo = "Saída"; handleLaunchTx(e); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Produto</label>
                  <select
                    value={txForm.produto_id}
                    onChange={e => {
                      const selected = produtos.find(p => p.id === parseInt(e.target.value));
                      setTxForm({ ...txForm, produto_id: e.target.value, valor_unitario: selected ? selected.preco_custo : 0 });
                    }}
                    style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                    required
                  >
                    <option value="">Selecione o produto...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (Saldo atual: {p.estoque_atual} un)</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Quantidade a Retirar</label>
                    <input
                      type="number"
                      min="1"
                      value={txForm.quantidade}
                      onChange={e => setTxForm({ ...txForm, quantidade: parseInt(e.target.value) || 1 })}
                      style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Valor Unitário de Custo (Auto)</label>
                    <input
                      type="number"
                      value={txForm.valor_unitario}
                      style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.bg }}
                      disabled
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Local / Setor de Destino</label>
                  <input
                    list="locais-list"
                    type="text"
                    placeholder="Ex: Almoxarifado, Copa, Recepção"
                    value={txForm.local}
                    onChange={e => setTxForm({ ...txForm, local: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Colaborador Retirante</label>
                  <input
                    list="funcionarios-list"
                    type="text"
                    placeholder="Ex: Carlos Oliveira"
                    value={txForm.funcionario}
                    onChange={e => setTxForm({ ...txForm, funcionario: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 10, padding: 12, borderRadius: 8, background: C.navy, color: "#fff",
                    border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer"
                  }}
                >
                  Confirmar Retirada (Saída)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TELA: ESTOQUE FÍSICO */}
        {activeSubTab === "fisico" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <input
                type="text"
                placeholder="🔍 Buscar no estoque por nome ou categoria..."
                value={searchEstoque}
                onChange={e => setSearchEstoque(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, width: "320px" }}
              />
              <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                Valor Total do Estoque: <b style={{ color: C.green }}>{money(totalValFinanceiro)}</b>
              </span>
            </div>

            <div style={{ flex: 1, overflow: "auto", background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}` }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>ID</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Produto</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Categoria</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted, textAlign: "center" }}>Estoque Atual</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Valor Financeiro (Custo)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstoque.map(p => {
                    const critico = p.estoque_atual < p.estoque_min;
                    const valFin = p.estoque_atual * p.preco_custo;
                    return (
                      <tr key={p.id} className="rowh" style={{ borderBottom: `1px solid ${C.line}` }}>
                        <td style={{ padding: "12px 16px", color: C.muted }} className="tnum">#{p.id}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: C.ink }}>{p.nome}</td>
                        <td style={{ padding: "12px 16px", color: C.body }}>{p.categoria}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          {critico ? (
                            <span style={{ background: C.redSoft, color: C.red, padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                              {p.estoque_atual} un (Abaixo do Mínimo!)
                            </span>
                          ) : (
                            <span style={{ background: C.greenSoft, color: C.green, padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                              {p.estoque_atual} un
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }} className="tnum">{money(valFin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TELA: RELATÓRIOS CSV */}
        {activeSubTab === "csv" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ width: "500px", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.navy, borderBottom: `1px solid ${C.line}`, paddingBottom: 10 }}>
                Painel de Exportação de Dados
              </span>
              <p style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>
                Aqui você pode exportar a lista completa de produtos com saldos, preços de custo e venda em formato CSV compatível com o Excel.
              </p>
              <button
                onClick={handleCSVExport}
                style={{
                  margin: "12px auto", padding: "12px 24px", borderRadius: 8, background: "#10b981", color: "#fff",
                  border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                }}
              >
                📥 Exportar Planilha de Estoque (CSV)
              </button>
            </div>
          </div>
        )}

        {/* TELA: DIÁRIO DE MOVIMENTAÇÕES */}
        {activeSubTab === "diario" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <input
                type="text"
                placeholder="🔍 Buscar movimentações por produto, local ou responsável..."
                value={searchDiario}
                onChange={e => setSearchDiario(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, width: "380px" }}
              />
              <span style={{ fontSize: 12.5, color: C.muted }}>Exibindo {filteredMovs.length} registros</span>
            </div>

            <div style={{ flex: 1, overflow: "auto", background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}` }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Operação</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Produto</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted, textAlign: "center" }}>Qtd.</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Valor Unit.</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Data Ocorrência</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Local Estoque</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted }}>Responsável</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: C.muted, textAlign: "right" }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovs.map((m, idx) => {
                    const isEntrada = m.tipo === "Entrada";
                    return (
                      <tr key={idx} className="rowh" style={{ borderBottom: `1px solid ${C.line}` }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11.5,
                            background: isEntrada ? C.greenSoft : C.redSoft,
                            color: isEntrada ? C.green : C.red
                          }}>
                            {isEntrada ? "⬆️ Entrada" : "⬇️ Saída"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: C.ink }}>{m.produto_nome}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }} className="tnum">{m.quantidade}</td>
                        <td style={{ padding: "12px 16px" }} className="tnum">{money(m.valor_unitario)}</td>
                        <td style={{ padding: "12px 16px", color: C.muted }} className="tnum">{m.data}</td>
                        <td style={{ padding: "12px 16px", color: C.body }}>{m.local}</td>
                        <td style={{ padding: "12px 16px", color: C.body }}>{m.funcionario}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button
                            onClick={() => handleUndoTx(m.tipo, m.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.red }}
                            title="Estornar Lançamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TELA: CONFIGURAÇÕES (Categorias, Locais, Funcionários) */}
        {activeSubTab === "config" && (
          <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
            {/* Sub-menu lateral de configs */}
            <div style={{ width: "160px", borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 4, paddingRight: 10 }}>
              <button
                onClick={() => setConfigSubTab("locais")}
                style={{
                  textAlign: "left", padding: 8, borderRadius: 6, fontSize: 12.5, fontWeight: configSubTab === "locais" ? 700 : 500,
                  background: configSubTab === "locais" ? C.navySoft : "transparent", color: configSubTab === "locais" ? C.navy : C.muted,
                  border: "none", cursor: "pointer"
                }}
              >
                📍 Locais
              </button>
              <button
                onClick={() => setConfigSubTab("funcionarios")}
                style={{
                  textAlign: "left", padding: 8, borderRadius: 6, fontSize: 12.5, fontWeight: configSubTab === "funcionarios" ? 700 : 500,
                  background: configSubTab === "funcionarios" ? C.navySoft : "transparent", color: configSubTab === "funcionarios" ? C.navy : C.muted,
                  border: "none", cursor: "pointer"
                }}
              >
                👥 Funcionários
              </button>
              <button
                onClick={() => setConfigSubTab("categorias")}
                style={{
                  textAlign: "left", padding: 8, borderRadius: 6, fontSize: 12.5, fontWeight: configSubTab === "categorias" ? 700 : 500,
                  background: configSubTab === "categorias" ? C.navySoft : "transparent", color: configSubTab === "categorias" ? C.navy : C.muted,
                  border: "none", cursor: "pointer"
                }}
              >
                🏷️ Categorias
              </button>
            </div>

            {/* Listagem e Adição de Configs */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <form onSubmit={handleAddConfig} style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  placeholder={configSubTab === "locais" ? "Nome do novo Local..." : configSubTab === "funcionarios" ? "Nome do novo Funcionário..." : "Nome da nova Categoria..."}
                  value={newConfigName}
                  onChange={e => setNewConfigName(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13, flex: 1 }}
                  required
                />
                <button
                  type="submit"
                  style={{ padding: "8px 16px", borderRadius: 6, background: C.navy, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Adicionar
                </button>
              </form>

              <div style={{ flex: 1, overflow: "auto", background: C.card, borderRadius: 10, border: `1px solid ${C.line}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}` }}>
                      <th style={{ padding: 10, fontWeight: 600, color: C.muted }}>ID</th>
                      <th style={{ padding: 10, fontWeight: 600, color: C.muted }}>Nome</th>
                      <th style={{ padding: 10, fontWeight: 600, color: C.muted, textAlign: "right" }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(configSubTab === "locais" ? locaisConfig : configSubTab === "funcionarios" ? funcionariosConfig : categoriasConfig).map(item => (
                      <tr key={item.id} className="rowh" style={{ borderBottom: `1px solid ${C.line}` }}>
                        <td style={{ padding: 10, color: C.muted }} className="tnum">#{item.id}</td>
                        <td style={{ padding: 10, fontWeight: 600, color: C.ink }}>{item.nome}</td>
                        <td style={{ padding: 10, textAlign: "right" }}>
                          <button
                            onClick={() => handleDeleteConfig(item.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.red }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TELA: ASSISTENTE ZARE */}
        {activeSubTab === "chat" && (
          <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, background: C.green, borderRadius: "50%" }} />
                <span style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>Zare Estoque AI</span>
              </div>
              
              <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {chatHistory.map(([role, text], idx) => {
                  const isUser = role === "user";
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "75%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        background: isUser ? C.navy : C.bg,
                        color: isUser ? "#fff" : C.ink,
                        border: isUser ? "none" : `1px solid ${C.line}`
                      }}>
                        {text}
                      </div>
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ background: C.bg, padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.line}` }}>
                      <Loader className="spin" size={16} color={C.muted} />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChat} style={{ padding: 12, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Ex: Dei entrada em 10 Papel A4 no almoxarifado por Ana Silva..."
                  value={chatMsg}
                  onChange={e => setChatMsg(e.target.value)}
                  disabled={chatLoading}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13 }}
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  style={{
                    padding: "10px 20px", borderRadius: 8, background: C.navy, color: "#fff",
                    border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Enviar
                </button>
              </form>
            </div>

            <div style={{ width: "240px", background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: C.navy }}>Prompt Exemplos</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <button
                  onClick={() => setChatMsg("Registrar entrada de 50 canetas azul no almoxarifado entregues por João, custo unitário 1.20")}
                  style={{ textAlign: "left", padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg, cursor: "pointer", color: C.ink }}
                >
                  "Registrar entrada de 50 canetas azul..."
                </button>
                <button
                  onClick={() => setChatMsg("Dei saída de 5 resmas de papel do estoque da Recepção sob responsabilidade de Amanda")}
                  style={{ textAlign: "left", padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg, cursor: "pointer", color: C.ink }}
                >
                  "Dei saída de 5 resmas de papel..."
                </button>
                <button
                  onClick={() => setChatMsg("Quais produtos estão abaixo do estoque mínimo?")}
                  style={{ textAlign: "left", padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg, cursor: "pointer", color: C.ink }}
                >
                  "Quais produtos estão abaixo do mínimo?"
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMAÇÃO DE LANÇAMENTOS IA MODAL */}
      {showConfirmModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: 20, borderRadius: 12, width: "500px",
            maxHeight: "85vh", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
              🤖 Confirmar Lançamentos Propostos pela Zare
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto", flex: 1 }}>
              {parsedCommands.map((cmd, idx) => {
                const isEntrada = cmd.acao === "registrar_entrada";
                const isSaida = cmd.acao === "registrar_saida";
                const isEstorno = cmd.acao === "estornar_ultimo_lancamento";
                
                return (
                  <div key={idx} style={{
                    padding: 12, borderRadius: 8, border: `1px solid ${C.line}`,
                    background: !cmd.estoque_suficiente ? C.redSoft : C.bg
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                        background: isEntrada ? C.greenSoft : isSaida ? C.redSoft : C.navySoft,
                        color: isEntrada ? C.green : isSaida ? C.red : C.navy
                      }}>
                        {cmd.acao.toUpperCase().replace("_", " ")}
                      </span>
                      {cmd.eh_novo && (
                        <span style={{ fontSize: 10, background: C.amberSoft, color: C.amber, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                          NOVO CADASTRO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                      Produto: {cmd.produto_name}
                    </div>
                    {isEntrada || isSaida ? (
                      <div style={{ fontSize: 12, color: C.body, marginTop: 4 }}>
                        Quantidade: {cmd.quantidade} un | Custo: {money(cmd.valor_unitario)}/un <br />
                        Local: {cmd.local} | Responsável: {cmd.funcionario}
                      </div>
                    ) : null}
                    
                    {isEstorno && (
                      <div style={{ fontSize: 12, color: C.body, marginTop: 4 }}>
                        {cmd.valido_estorno ? (
                          <span>Estornar {cmd.mov_tipo_estorno.toLowerCase()} de {cmd.mov_qtd_estorno} un (ID: #{cmd.mov_id_estorno})</span>
                        ) : (
                          <span style={{ color: C.red, fontWeight: 600 }}>Nenhum lançamento localizado para estornar.</span>
                        )}
                      </div>
                    )}

                    {!cmd.estoque_suficiente && (
                      <div style={{ color: C.red, fontSize: 11, fontWeight: 700, marginTop: 6 }}>
                        ❌ Saldo Insuficiente! Estoque atual: {cmd.saldo_atual} un.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setParsedCommands([]);
                }}
                style={{
                  padding: "8px 14px", borderRadius: 8, background: C.bg, color: C.ink,
                  border: `1px solid ${C.line}`, fontSize: 12.5, fontWeight: 600, cursor: "pointer"
                }}
              >
                Descartar
              </button>
              <button
                onClick={handleExecuteCommands}
                disabled={parsedCommands.some(c => c.acao === "registrar_saida" && !c.estoque_suficiente)}
                style={{
                  padding: "8px 14px", borderRadius: 8, background: C.navy, color: "#fff",
                  border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  opacity: parsedCommands.some(c => c.acao === "registrar_saida" && !c.estoque_suficiente) ? 0.5 : 1
                }}
              >
                Confirmar Lançamentos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CADASTRAR/EDITAR PRODUTO MODAL */}
      {showAddProd && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 1000
        }}>
          <form onSubmit={handleSaveProd} style={{
            background: "#fff", padding: 20, borderRadius: 12, width: "400px",
            display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.15)"
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.navy, borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
              {editingProd ? "Editar Produto" : "Cadastrar Novo Produto"}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Nome do Produto</label>
              <input
                type="text"
                value={prodForm.nome}
                onChange={e => setProdForm({ ...prodForm, nome: e.target.value })}
                style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Categoria</label>
              <input
                list="cats-list"
                type="text"
                value={prodForm.categoria}
                onChange={e => setProdForm({ ...prodForm, categoria: e.target.value })}
                style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}
                required
              />
              <datalist id="cats-list">
                {categoriasConfig.map((c, idx) => <option key={idx} value={c.nome} />)}
              </datalist>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Cota Mínima</label>
              <input
                type="number"
                min="0"
                value={prodForm.estoque_min}
                onChange={e => setProdForm({ ...prodForm, estoque_min: parseInt(e.target.value) || 0 })}
                style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}
                required
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Preço Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prodForm.preco_custo}
                  onChange={e => setProdForm({ ...prodForm, preco_custo: parseFloat(e.target.value) || 0 })}
                  style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Preço Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prodForm.preco_venda}
                  onChange={e => setProdForm({ ...prodForm, preco_venda: parseFloat(e.target.value) || 0 })}
                  style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddProd(false);
                  setEditingProd(null);
                }}
                style={{
                  padding: "8px 14px", borderRadius: 8, background: C.bg, color: C.ink,
                  border: `1px solid ${C.line}`, fontSize: 12.5, fontWeight: 600, cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: "8px 14px", borderRadius: 8, background: C.navy, color: "#fff",
                  border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer"
                }}
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
