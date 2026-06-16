import { useState, useMemo } from "react";
import { 
  Plus, Search, Calendar, FileText, Camera, Upload, Trash2, Check, Clock, 
  MapPin, User, Fuel, Settings, AlertTriangle, HelpCircle, ArrowRight, X, ChevronRight, Eye, DollarSign
} from "lucide-react";

// Constantes de Cores
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
  amberSoft: "#fef3c7",
  blue: "#2563eb",
  blueSoft: "#dbeafe"
};

const formatMoney = (n) => 
  (typeof n === "number" ? n : Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const formatDateBr = (dStr) => {
  if (!dStr) return "";
  const parts = dStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
};

export default function Motoboy({ db, saveMotoboy, me, notify }) {
  const canViewSolic = me?.isAdmin || (me?.view || []).includes("motoboy_solic");
  const canViewManut = me?.isAdmin || (me?.view || []).includes("motoboy_manut");
  const [tab, setTab] = useState(canViewSolic ? "solicitacoes" : "manutencao");
  const [subTab, setSubTab] = useState("resumo"); // "resumo", "abastecimento", "oleo", "manutencao", "moto"
  
  // Dados estruturados herdados ou padrões vazios
  const solicitacoes = useMemo(() => db?.motoboy?.solicitacoes || [], [db]);
  const veiculos = useMemo(() => db?.motoboy?.veiculo || [], [db]);
  const abastecimentos = useMemo(() => db?.motoboy?.abastecimento || [], [db]);
  const oleos = useMemo(() => db?.motoboy?.oleo || [], [db]);
  const manutençoes = useMemo(() => db?.motoboy?.manutencao || [], [db]);
  
  // Moto ativa (caso não exista, simula um objeto padrão)
  const motoAtiva = useMemo(() => {
    if (veiculos.length > 0) return veiculos[0];
    return { id: 1, placa: "RAX9F96", modelo: "Fan 160", fabricante: "Honda", ano: 2022, tipo_oleo: "Mobil Super Moto 10W 30Mx", intervalo_oleo: 1000 };
  }, [veiculos]);

  // Permissões
  const isAdmin = me?.isAdmin === true;
  const isMotoboy = me?.cargo?.toLowerCase() === "motoboy" || me?.nome?.toLowerCase() === "motoboy" || me?.deptEdit === "motoboy";
  const canManageMoto = isAdmin || (me?.view || []).includes("motoboy_manut");

  // Filtros de solicitações
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modais
  const [showAddSolic, setShowAddSolic] = useState(false);
  const [showFinalizeSolic, setShowFinalizeSolic] = useState(null); // guarda a solicitação que está finalizando
  const [showViewProtocol, setShowViewProtocol] = useState(null); // guarda a foto base64 a exibir
  const [showAddAbast, setShowAddAbast] = useState(false);
  const [showAddOleo, setShowAddOleo] = useState(false);
  const [showAddManut, setShowAddManut] = useState(false);
  const [showEditMoto, setShowEditMoto] = useState(false);

  // Formulários
  const [solicForm, setSolicForm] = useState({
    destino: "",
    descricao: "",
    data_solicitacao: new Date().toISOString().substring(0, 10),
    solicitante_nome: me?.nome || "",
    solicitante_setor: me?.deptEdit || me?.dept || "Geral"
  });

  const [finalizeForm, setFinalizeForm] = useState({
    obs: "",
    data_conclusao: new Date().toISOString().substring(0, 10),
    foto_protocolo: ""
  });

  const [abastForm, setAbastForm] = useState({
    data: new Date().toISOString().substring(0, 10),
    posto: "Posto Smile",
    custo_total: "",
    preco_litro: "",
    km_atual: ""
  });

  const [oleoForm, setOleoForm] = useState({
    data: new Date().toISOString().substring(0, 10),
    estabelecimento: "",
    oleo: motoAtiva.tipo_oleo || "Mobil Super Moto 10W 30Mx",
    km_atual: "",
    custo_total: "",
    filtro_oleo: false,
    filtro_combustivel: false,
    km_util: motoAtiva.intervalo_oleo || 1000
  });

  const [manutForm, setManutForm] = useState({
    data: new Date().toISOString().substring(0, 10),
    estabelecimento: "",
    tipo_servico: "Preventiva",
    descricao: "",
    custo_total: "",
    km_atual: ""
  });

  const [motoForm, setMotoForm] = useState({
    placa: motoAtiva.placa,
    modelo: motoAtiva.modelo,
    fabricante: motoAtiva.fabricante,
    ano: motoAtiva.ano,
    tipo_oleo: motoAtiva.tipo_oleo,
    intervalo_oleo: motoAtiva.intervalo_oleo
  });

  // Métricas calculadas para a moto
  const kmAtual = useMemo(() => {
    const kms = [
      ...abastecimentos.map(a => Number(a.km_atual) || 0),
      ...oleos.map(o => Number(o.km_atual) || 0),
      ...manutençoes.map(m => Number(m.km_atual) || 0)
    ];
    return kms.length > 0 ? Math.max(...kms) : 0;
  }, [abastecimentos, oleos, manutençoes]);

  const totalSpentAbast = useMemo(() => abastecimentos.reduce((acc, curr) => acc + (Number(curr.custo_total) || 0), 0), [abastecimentos]);
  const totalSpentOleo = useMemo(() => oleos.reduce((acc, curr) => acc + (Number(curr.custo_total) || 0), 0), [oleos]);
  const totalSpentManut = useMemo(() => manutençoes.reduce((acc, curr) => acc + (Number(curr.custo_total) || 0), 0), [manutençoes]);
  const totalSpentOverall = totalSpentAbast + totalSpentOleo + totalSpentManut;

  const ultimoOleo = useMemo(() => {
    if (oleos.length === 0) return null;
    return [...oleos].sort((a, b) => (a.data < b.data ? 1 : -1))[0];
  }, [oleos]);

  const proxTrocaOleoKm = useMemo(() => {
    if (!ultimoOleo) return null;
    return (Number(ultimoOleo.km_atual) || 0) + (Number(ultimoOleo.km_util) || 1000);
  }, [ultimoOleo]);

  const oleoAlert = useMemo(() => {
    if (!proxTrocaOleoKm) return { variant: "gray", label: "Sem trocas registradas" };
    const restante = proxTrocaOleoKm - kmAtual;
    if (restante <= 0) return { variant: "red", label: `Troca vencida há ${Math.abs(restante)} km` };
    if (restante <= 150) return { variant: "amber", label: `Troca próxima (restam ${restante} km)` };
    return { variant: "green", label: `Óleo OK (restam ${restante} km)` };
  }, [kmAtual, proxTrocaOleoKm]);

  // Consumo médio aproximado
  const kmPercorridos = useMemo(() => {
    const list = [...abastecimentos].sort((a, b) => (a.km_atual > b.km_atual ? 1 : -1));
    if (list.length < 2) return 0;
    return (Number(list[list.length - 1].km_atual) || 0) - (Number(list[0].km_atual) || 0);
  }, [abastecimentos]);

  const totalLitros = useMemo(() => {
    const list = [...abastecimentos].sort((a, b) => (a.km_atual > b.km_atual ? 1 : -1));
    if (list.length < 2) return 0;
    // Soma todos exceto o primeiro para cálculo de consumo
    return list.slice(1).reduce((acc, curr) => acc + (Number(curr.litros) || (curr.custo_total / curr.preco_litro) || 0), 0);
  }, [abastecimentos]);

  const consumoMedio = useMemo(() => {
    if (kmPercorridos <= 0 || totalLitros <= 0) return null;
    return (kmPercorridos / totalLitros).toFixed(1);
  }, [kmPercorridos, totalLitros]);

  // Filtro de solicitações
  const listSolic = useMemo(() => {
    return solicitacoes.filter(s => {
      const isAdmin = me?.isAdmin;
      const isMotoboyDept = me?.dept === "motoboy";
      const myDept = me?.dept;
      const myDeptEdit = me?.deptEdit;
      
      const hasAccess = isAdmin || isMotoboyDept || 
        (s.solicitante_setor && (s.solicitante_setor === myDept || s.solicitante_setor === myDeptEdit)) ||
        (s.solicitante_nome && s.solicitante_nome === me?.nome);
        
      if (!hasAccess) return false;

      const matchStatus = filterStatus === "Todos" || s.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        (s.destino || "").toLowerCase().includes(q) || 
        (s.descricao || "").toLowerCase().includes(q) || 
        (s.solicitante_nome || "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [solicitacoes, filterStatus, searchQuery, me]);

  // Handlers para Ações
  const handleAddSolic = () => {
    if (!solicForm.destino.trim() || !solicForm.descricao.trim()) {
      notify("Preencha o destino e os itens para entrega.", "deny");
      return;
    }
    const newId = Date.now();
    const newRecord = {
      id: newId,
      data_solicitacao: solicForm.data_solicitacao,
      solicitante_nome: solicForm.solicitante_nome,
      solicitante_setor: solicForm.solicitante_setor,
      destino: solicForm.destino.trim(),
      descricao: solicForm.descricao.trim(),
      status: "Aberto",
      foto_protocolo: "",
      data_conclusao: "",
      obs: ""
    };
    saveMotoboy(prev => ({
      ...prev,
      solicitacoes: [newRecord, ...(prev.solicitacoes || [])]
    }), `Motoboy · Nova solicitação criada por ${newRecord.solicitante_nome}`);
    setShowAddSolic(false);
    setSolicForm(o => ({ ...o, destino: "", descricao: "" }));
    notify("Solicitação de entrega enviada!", "ok");
  };

  const handleUpdateStatus = (solic, nextStatus) => {
    saveMotoboy(prev => ({
      ...prev,
      solicitacoes: (prev.solicitacoes || []).map(s => 
        s.id === solic.id ? { ...s, status: nextStatus } : s
      )
    }), `Motoboy · Solicitação #${solic.id} alterada para ${nextStatus}`);
    notify(`Status alterado para: ${nextStatus}`, "ok");
  };

  const handleFinalizeSolic = () => {
    if (!finalizeForm.foto_protocolo && !confirm("Deseja finalizar esta entrega sem anexar foto do protocolo assinado?")) {
      return;
    }
    saveMotoboy(prev => ({
      ...prev,
      solicitacoes: (prev.solicitacoes || []).map(s => 
        s.id === showFinalizeSolic.id ? { 
          ...s, 
          status: "Concluído", 
          obs: finalizeForm.obs.trim(),
          data_conclusao: finalizeForm.data_conclusao,
          foto_protocolo: finalizeForm.foto_protocolo
        } : s
      )
    }), `Motoboy · Solicitação #${showFinalizeSolic.id} concluída`);
    setShowFinalizeSolic(null);
    setFinalizeForm({ obs: "", data_conclusao: new Date().toISOString().substring(0, 10), foto_protocolo: "" });
    notify("Entrega finalizada com sucesso!", "ok");
  };

  const handleDeleteSolic = (id) => {
    if (!confirm("Tem certeza que deseja remover esta solicitação?")) return;
    saveMotoboy(prev => ({
      ...prev,
      solicitacoes: (prev.solicitacoes || []).filter(s => s.id !== id)
    }), "Motoboy · Solicitação excluída");
    notify("Solicitação excluída.", "ok");
  };

  // Redimensionador de imagens para protocolo (Mobile Friendly)
  const processImageFile = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800; // Resolução máx leve
        let w = img.width;
        let h = img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL("image/jpeg", 0.78); // compactação leve
          callback(base64);
        } catch (err) {
          callback(reader.result);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Abastecimento
  const handleAddAbast = () => {
    const total = Number(abastForm.custo_total);
    const preco = Number(abastForm.preco_litro);
    const km = Number(abastForm.km_atual);
    if (!total || !preco || !km) {
      notify("Preencha custo, preço do litro e KM atual.", "deny");
      return;
    }
    const litros = Number((total / preco).toFixed(2));
    const newRecord = {
      id: Date.now(),
      data: abastForm.data,
      posto: abastForm.posto.trim(),
      custo_total: total,
      preco_litro: preco,
      litros: litros,
      km_atual: km
    };
    saveMotoboy(prev => ({
      ...prev,
      abastecimento: [newRecord, ...(prev.abastecimento || [])]
    }), `Motoboy · Abastecimento registrado (KM ${km})`);
    setShowAddAbast(false);
    setAbastForm(o => ({ ...o, custo_total: "", preco_litro: "", km_atual: "" }));
    notify("Abastecimento registrado!", "ok");
  };

  const handleDeleteAbast = (id) => {
    if (!confirm("Remover este registro de abastecimento?")) return;
    saveMotoboy(prev => ({
      ...prev,
      abastecimento: (prev.abastecimento || []).filter(a => a.id !== id)
    }), "Motoboy · Abastecimento removido");
    notify("Abastecimento removido.", "ok");
  };

  // Oleo
  const handleAddOleo = () => {
    const cost = Number(oleoForm.custo_total);
    const km = Number(oleoForm.km_atual);
    if (!cost || !km || !oleoForm.estabelecimento.trim()) {
      notify("Preencha oficina, custo e KM atual.", "deny");
      return;
    }
    const newRecord = {
      id: Date.now(),
      data: oleoForm.data,
      estabelecimento: oleoForm.estabelecimento.trim(),
      oleo: oleoForm.oleo.trim(),
      km_atual: km,
      custo_total: cost,
      filtro_oleo: oleoForm.filtro_oleo,
      filtro_combustivel: oleoForm.filtro_combustivel,
      km_util: Number(oleoForm.km_util) || 1000
    };
    saveMotoboy(prev => ({
      ...prev,
      oleo: [newRecord, ...(prev.oleo || [])]
    }), `Motoboy · Troca de óleo registrada (KM ${km})`);
    setShowAddOleo(false);
    setOleoForm(o => ({ ...o, estabelecimento: "", km_atual: "", custo_total: "", filtro_oleo: false, filtro_combustivel: false }));
    notify("Troca de óleo registrada!", "ok");
  };

  const handleDeleteOleo = (id) => {
    if (!confirm("Remover este registro de troca de óleo?")) return;
    saveMotoboy(prev => ({
      ...prev,
      oleo: (prev.oleo || []).filter(o => o.id !== id)
    }), "Motoboy · Troca de óleo removida");
    notify("Troca de óleo removida.", "ok");
  };

  // Manutenção
  const handleAddManut = () => {
    const cost = Number(manutForm.custo_total);
    const km = Number(manutForm.km_atual);
    if (!cost || !km || !manutForm.estabelecimento.trim() || !manutForm.descricao.trim()) {
      notify("Preencha estabelecimento, descrição, custo e KM atual.", "deny");
      return;
    }
    const newRecord = {
      id: Date.now(),
      data: manutForm.data,
      estabelecimento: manutForm.estabelecimento.trim(),
      tipo_servico: manutForm.tipo_servico,
      descricao: manutForm.descricao.trim(),
      custo_total: cost,
      km_atual: km
    };
    saveMotoboy(prev => ({
      ...prev,
      manutencao: [newRecord, ...(prev.manutencao || [])]
    }), `Motoboy · Manutenção mecânica registrada (KM ${km})`);
    setShowAddManut(false);
    setManutForm(o => ({ ...o, estabelecimento: "", descricao: "", custo_total: "", km_atual: "" }));
    notify("Manutenção registrada!", "ok");
  };

  const handleDeleteManut = (id) => {
    if (!confirm("Remover este registro de manutenção?")) return;
    saveMotoboy(prev => ({
      ...prev,
      manutencao: (prev.manutencao || []).filter(m => m.id !== id)
    }), "Motoboy · Manutenção removida");
    notify("Manutenção removida.", "ok");
  };

  // Cadastro da Moto
  const handleSaveMoto = () => {
    if (!motoForm.placa.trim() || !motoForm.modelo.trim()) {
      notify("Placa e modelo são obrigatórios.", "deny");
      return;
    }
    const updated = {
      id: 1,
      placa: motoForm.placa.trim().toUpperCase(),
      modelo: motoForm.modelo.trim(),
      fabricante: motoForm.fabricante.trim(),
      ano: Number(motoForm.ano) || 2022,
      tipo_oleo: motoForm.tipo_oleo.trim(),
      intervalo_oleo: Number(motoForm.intervalo_oleo) || 1000
    };
    saveMotoboy(prev => ({
      ...prev,
      veiculo: [updated]
    }), `Motoboy · Configurações da moto atualizadas (${updated.modelo})`);
    setShowEditMoto(false);
    notify("Cadastro da moto atualizado!", "ok");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Abas Superiores Principais */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, marginBottom: 14, flexShrink: 0 }}>
        {canViewSolic && (
          <button 
            onClick={() => setTab("solicitacoes")} 
            style={{
              flex: 1, padding: "12px 8px", border: "none", borderBottom: `3px solid ${tab === "solicitacoes" ? C.navy : "transparent"}`,
              background: "transparent", color: tab === "solicitacoes" ? C.navy : C.muted, fontSize: 14.5, fontWeight: tab === "solicitacoes" ? 800 : 600,
              cursor: "pointer"
            }}
          >
            Solicitações de Entrega
          </button>
        )}
        {canViewManut && (
          <button 
            onClick={() => setTab("manutencao")} 
            style={{
              flex: 1, padding: "12px 8px", border: "none", borderBottom: `3px solid ${tab === "manutencao" ? C.navy : "transparent"}`,
              background: "transparent", color: tab === "manutencao" ? C.navy : C.muted, fontSize: 14.5, fontWeight: tab === "manutencao" ? 800 : 600,
              cursor: "pointer"
            }}
          >
            Manutenção do Veículo
          </button>
        )}
      </div>

      {/* ABA 1: SOLICITAÇÕES DE ENTREGA */}
      {canViewSolic && tab === "solicitacoes" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Header e Filtros */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={16} color={C.muted} style={{ position: "absolute", left: 10, top: 11 }} />
              <input 
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar destino, solicitante..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.card, fontSize: 14 }}
              />
            </div>
            <select 
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.card, fontSize: 14, color: C.body, cursor: "pointer" }}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aberto">Abertos</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluídos</option>
              <option value="Cancelado">Cancelados</option>
            </select>
            <button 
              onClick={() => setShowAddSolic(true)} 
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", border: "none", borderRadius: 8,
                background: C.navy, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer"
              }}
            >
              <Plus size={16} /> Nova Entrega
            </button>
          </div>

          {/* Cards de Solicitações (Mobile Friendly) */}
          <div style={{ flex: 1, overflow: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, paddingBottom: 15 }}>
            {listSolic.map(s => {
              const isOpen = s.status === "Aberto";
              const isProgress = s.status === "Em Andamento";
              const isDone = s.status === "Concluído";
              const isCancelled = s.status === "Cancelado";
              
              let statusBg = C.blueSoft, statusFg = C.blue;
              if (isProgress) { statusBg = C.amberSoft; statusFg = C.amber; }
              if (isDone) { statusBg = C.greenSoft; statusFg = C.green; }
              if (isCancelled) { statusBg = C.redSoft; statusFg = C.red; }

              const belongsToMe = s.solicitante_nome === me?.nome;

              return (
                <div key={s.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 15, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 12.5, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
                      <Calendar size={13} /> {formatDateBr(s.data_solicitacao)}
                    </div>
                    <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 800, background: statusBg, color: statusFg }}>
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>Destino:</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={14} color={C.red} style={{ flexShrink: 0 }} /> {s.destino}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>Descrição / Itens:</div>
                    <div style={{ fontSize: 14, color: C.body, background: C.bg, padding: "8px 10px", borderRadius: 6, borderLeft: `3px solid ${C.navy}` }}>
                      {s.descricao}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                    <User size={13} /> Solicitado por: <b>{s.solicitante_nome}</b> ({s.solicitante_setor})
                  </div>

                  {s.obs && (
                    <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 8, fontSize: 13, color: C.body }}>
                      <b>Obs Motoboy:</b> {s.obs}
                    </div>
                  )}

                  {/* Ações */}
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${C.line}`, paddingTop: 10, flexWrap: "wrap" }}>
                    {/* Botão de Ver Protocolo se concluído e com imagem */}
                    {s.foto_protocolo && (
                      <button 
                        onClick={() => setShowViewProtocol(s.foto_protocolo)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 11px", border: `1px solid ${C.greenSoft}`, borderRadius: 6,
                          background: C.greenSoft, color: C.green, fontSize: 12.5, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        <Eye size={13} /> Ver Protocolo
                      </button>
                    )}

                    {/* Ações do Motoboy ou Admin */}
                    {canManageMoto && isOpen && (
                      <button 
                        onClick={() => handleUpdateStatus(s, "Em Andamento")}
                        style={{
                          flex: 1, display: "inline-flex", alignItems: "center", justify: "center", justifyContent: "center", gap: 4, padding: "7px 10px", border: "none", borderRadius: 6,
                          background: C.navy, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        Iniciar Entrega <ChevronRight size={13} />
                      </button>
                    )}

                    {canManageMoto && isProgress && (
                      <button 
                        onClick={() => setShowFinalizeSolic(s)}
                        style={{
                          flex: 1, display: "inline-flex", alignItems: "center", justify: "center", justifyContent: "center", gap: 4, padding: "7px 10px", border: "none", borderRadius: 6,
                          background: C.green, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        <Check size={13} /> Finalizar
                      </button>
                    )}

                    {/* Permite que o solicitante cancele ou edite se ainda aberto */}
                    {isOpen && (belongsToMe || isAdmin) && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(s, "Cancelado")}
                          style={{
                            padding: "7px 10px", border: `1px solid ${C.redSoft}`, borderRadius: 6,
                            background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 700, cursor: "pointer"
                          }}
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {/* Admin pode apagar registros */}
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteSolic(s.id)}
                        style={{
                          padding: "7px 8px", border: `1px solid ${C.line}`, borderRadius: 6,
                          background: "transparent", color: C.muted, cursor: "pointer"
                        }}
                        title="Remover Registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {listSolic.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 10px", color: C.muted, fontSize: 14.5 }}>
                <FileText size={48} color={C.line} style={{ margin: "0 auto 10px" }} />
                Nenhuma solicitação de entrega localizada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CONTROLE DE MANUTENÇÃO (REPLICA DA PLANILHA) */}
      {canViewManut && tab === "manutencao" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Sub Menu de Controle de Veículo */}
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 8, marginBottom: 12, flexShrink: 0 }}>
            {["resumo", "abastecimento", "oleo", "manutencao", "moto"].map(k => {
              const labels = { resumo: "Resumo Geral", abastecimento: "Abastecimentos", oleo: "Trocas de Óleo", manutencao: "Manutenções", moto: "Dados da Moto" };
              const on = subTab === k;
              return (
                <button
                  key={k} onClick={() => setSubTab(k)}
                  style={{
                    padding: "7px 12px", border: `1px solid ${on ? C.navy : C.line}`, borderRadius: 7,
                    background: on ? C.navySoft : "transparent", color: on ? C.navy : C.body, fontSize: 13, fontWeight: on ? 800 : 600,
                    cursor: "pointer", whiteSpace: "nowrap"
                  }}
                >
                  {labels[k]}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {/* SUB-ABA: RESUMO GERAL */}
            {subTab === "resumo" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 15 }}>
                {/* Moto Info Card */}
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 15, display: "flex", flexWrap: "wrap", gap: 15, alignItems: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.01)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 9, background: C.navySoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, flexShrink: 0 }}>
                    <Fuel size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Veículo Ativo</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{motoAtiva.fabricante} {motoAtiva.modelo} <span style={{ color: C.muted, fontWeight: 400 }}>({motoAtiva.placa})</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Hodômetro Atual</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>{kmAtual} Km</div>
                  </div>
                </div>

                {/* KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: 12 }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Total de Gastos</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 4 }}>{formatMoney(totalSpentOverall)}</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: 12 }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Abastecimentos</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 4 }}>{formatMoney(totalSpentAbast)}</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: 12 }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Trocas de Óleo</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 4 }}>{formatMoney(totalSpentOleo)}</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: 12 }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Manutenções</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginTop: 4 }}>{formatMoney(totalSpentManut)}</div>
                  </div>
                </div>

                {/* Alerta de óleo e consumo */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                  {/* Óleo alert */}
                  <div style={{
                    background: oleoAlert.variant === "red" ? C.redSoft : oleoAlert.variant === "amber" ? C.amberSoft : C.greenSoft,
                    border: `1px solid ${oleoAlert.variant === "red" ? "#fecaca" : oleoAlert.variant === "amber" ? "#fde68a" : "#bbf7d0"},`,
                    borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "start"
                  }}>
                    <AlertTriangle size={20} color={oleoAlert.variant === "red" ? C.red : oleoAlert.variant === "amber" ? C.amber : C.green} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Saúde do Óleo Motor</div>
                      <div style={{ fontSize: 13, color: C.body, marginTop: 4 }}>
                        {oleoAlert.label}. Intervalo recomendado de <b>{motoAtiva.intervalo_oleo} km</b>.
                      </div>
                      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>
                        Última troca no KM: {ultimoOleo ? ultimoOleo.km_atual : "Nenhuma registrada"}. Próxima com: {proxTrocaOleoKm ? proxTrocaOleoKm : "—"} KM.
                      </div>
                    </div>
                  </div>

                  {/* Consumo info */}
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "start" }}>
                    <Fuel size={20} color={C.blue} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Média de Consumo</div>
                      <div style={{ fontSize: 13, color: C.body, marginTop: 4 }}>
                        {consumoMedio ? (
                          <>A moto está fazendo em média <b>{consumoMedio} Km/L</b>.</>
                        ) : (
                          <>Registre pelo menos 2 abastecimentos com KM para obter a média de consumo.</>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                        Quilometros percorridos na base: {kmPercorridos} Km. Combustível no cálculo: {totalLitros.toFixed(1)} L.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-ABA: ABASTECIMENTOS */}
            {subTab === "abastecimento" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 15 }}>
                <div style={{ display: "flex", justify: "space-between", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Histórico de Abastecimentos</span>
                  {canManageMoto && (
                    <button onClick={() => setShowAddAbast(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", border: "none", borderRadius: 7, background: C.navy, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      <Plus size={14} /> Novo Abastecimento
                    </button>
                  )}
                </div>

                <div style={{ overflow: "auto", border: `1px solid ${C.line}`, borderRadius: 10, background: C.card }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.ink, fontWeight: 700 }}>
                        <th style={{ padding: 10 }}>Data</th>
                        <th style={{ padding: 10 }}>Posto</th>
                        <th style={{ padding: 10 }}>KM</th>
                        <th style={{ padding: 10 }}>Litros</th>
                        <th style={{ padding: 10 }}>Preço/L</th>
                        <th style={{ padding: 10 }}>Custo</th>
                        {canManageMoto && <th style={{ padding: 10 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {abastecimentos.map(a => (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${C.line}`, color: C.body }}>
                          <td style={{ padding: 10 }}>{formatDateBr(a.data)}</td>
                          <td style={{ padding: 10 }}>{a.posto}</td>
                          <td style={{ padding: 10 }} className="tnum">{a.km_atual} km</td>
                          <td style={{ padding: 10 }} className="tnum">{a.litros} L</td>
                          <td style={{ padding: 10 }} className="tnum">{formatMoney(a.preco_litro)}</td>
                          <td style={{ padding: 10, fontWeight: 700 }} className="tnum">{formatMoney(a.custo_total)}</td>
                          {canManageMoto && (
                            <td style={{ padding: 10, textAlign: "right" }}>
                              <button onClick={() => handleDeleteAbast(a.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {abastecimentos.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: 20, textAlign: "center", color: C.muted }}>Nenhum abastecimento registrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-ABA: TROCAS DE ÓLEO */}
            {subTab === "oleo" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 15 }}>
                <div style={{ display: "flex", justify: "space-between", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Histórico de Trocas de Óleo</span>
                  {canManageMoto && (
                    <button onClick={() => setShowAddOleo(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", border: "none", borderRadius: 7, background: C.navy, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      <Plus size={14} /> Nova Troca de Óleo
                    </button>
                  )}
                </div>

                <div style={{ overflow: "auto", border: `1px solid ${C.line}`, borderRadius: 10, background: C.card }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.ink, fontWeight: 700 }}>
                        <th style={{ padding: 10 }}>Data</th>
                        <th style={{ padding: 10 }}>Oficina</th>
                        <th style={{ padding: 10 }}>KM Troca</th>
                        <th style={{ padding: 10 }}>Óleo</th>
                        <th style={{ padding: 10 }}>Filtros</th>
                        <th style={{ padding: 10 }}>Próxima Troca</th>
                        <th style={{ padding: 10 }}>Custo</th>
                        {canManageMoto && <th style={{ padding: 10 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {oleos.map(o => (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}`, color: C.body }}>
                          <td style={{ padding: 10 }}>{formatDateBr(o.data)}</td>
                          <td style={{ padding: 10 }}>{o.estabelecimento}</td>
                          <td style={{ padding: 10 }} className="tnum">{o.km_atual} km</td>
                          <td style={{ padding: 10 }}>{o.oleo}</td>
                          <td style={{ padding: 10 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {o.filtro_oleo && <span style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: C.blueSoft, color: C.blue, fontWeight: 800 }}>Filtro Óleo</span>}
                              {o.filtro_combustivel && <span style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: C.amberSoft, color: C.amber, fontWeight: 800 }}>Filtro Comb.</span>}
                              {!o.filtro_oleo && !o.filtro_combustivel && <span style={{ color: C.muted }}>Nenhum</span>}
                            </div>
                          </td>
                          <td style={{ padding: 10, fontWeight: 700, color: C.navy }} className="tnum">
                            {(Number(o.km_atual) || 0) + (Number(o.km_util) || 1000)} km
                          </td>
                          <td style={{ padding: 10, fontWeight: 700 }} className="tnum">{formatMoney(o.custo_total)}</td>
                          {canManageMoto && (
                            <td style={{ padding: 10, textAlign: "right" }}>
                              <button onClick={() => handleDeleteOleo(o.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {oleos.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: 20, textAlign: "center", color: C.muted }}>Nenhuma troca de óleo registrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-ABA: MANUTENÇÕES */}
            {subTab === "manutencao" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 15 }}>
                <div style={{ display: "flex", justify: "space-between", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Histórico de Manutenções</span>
                  {canManageMoto && (
                    <button onClick={() => setShowAddManut(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", border: "none", borderRadius: 7, background: C.navy, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      <Plus size={14} /> Nova Manutenção
                    </button>
                  )}
                </div>

                <div style={{ overflow: "auto", border: `1px solid ${C.line}`, borderRadius: 10, background: C.card }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.ink, fontWeight: 700 }}>
                        <th style={{ padding: 10 }}>Data</th>
                        <th style={{ padding: 10 }}>Oficina</th>
                        <th style={{ padding: 10 }}>Tipo</th>
                        <th style={{ padding: 10 }}>Descrição do Serviço</th>
                        <th style={{ padding: 10 }}>KM</th>
                        <th style={{ padding: 10 }}>Custo</th>
                        {canManageMoto && <th style={{ padding: 10 }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {manutençoes.map(m => (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${C.line}`, color: C.body }}>
                          <td style={{ padding: 10 }}>{formatDateBr(m.data)}</td>
                          <td style={{ padding: 10 }}>{m.estabelecimento}</td>
                          <td style={{ padding: 10 }}>
                            <span style={{
                              fontSize: 10.5, padding: "2px 6px", borderRadius: 4, fontWeight: 800,
                              background: m.tipo_servico === "Corretiva" ? C.redSoft : C.navySoft,
                              color: m.tipo_servico === "Corretiva" ? C.red : C.navy
                            }}>
                              {m.tipo_servico}
                            </span>
                          </td>
                          <td style={{ padding: 10 }}>{m.descricao}</td>
                          <td style={{ padding: 10 }} className="tnum">{m.km_atual} km</td>
                          <td style={{ padding: 10, fontWeight: 700 }} className="tnum">{formatMoney(m.custo_total)}</td>
                          {canManageMoto && (
                            <td style={{ padding: 10, textAlign: "right" }}>
                              <button onClick={() => handleDeleteManut(m.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {manutençoes.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: 20, textAlign: "center", color: C.muted }}>Nenhuma manutenção mecânica registrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-ABA: DADOS DA MOTO */}
            {subTab === "moto" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 15 }}>
                <div style={{ display: "flex", justify: "space-between", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Especificações Técnicas do Veículo</span>
                  {canManageMoto && (
                    <button onClick={() => { setMotoForm({ ...motoAtiva }); setShowEditMoto(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 7, background: C.card, color: C.body, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      <Settings size={14} /> Editar Cadastro
                    </button>
                  )}
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 15, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15 }}>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Fabricante</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>{motoAtiva.fabricante}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Modelo / Versão</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>{motoAtiva.modelo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Placa</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>{motoAtiva.placa}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Ano de Fabricação</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>{motoAtiva.ano}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Óleo Motor Recomendado</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: C.navy, marginTop: 2 }}>{motoAtiva.tipo_oleo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>Frequência de Troca (Km)</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: C.navy, marginTop: 2 }}>Cada {motoAtiva.intervalo_oleo} km</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAIS ==================== */}

      {/* Modal: Nova Solicitação de Entrega */}
      {showAddSolic && (
        <Modal title="Nova Solicitação de Entrega" onClose={() => setShowAddSolic(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={fl}>Destino / Endereço / Cliente *</label>
              <input 
                type="text" value={solicForm.destino} onChange={e => setSolicForm(o => ({ ...o, destino: e.target.value }))}
                placeholder="Ex: Cartório 1º Ofício / Rua XV de Novembro, 120" style={fi}
              />
            </div>
            <div>
              <label style={fl}>Itens para Entrega / Descrição *</label>
              <textarea 
                value={solicForm.descricao} onChange={e => setSolicForm(o => ({ ...o, descricao: e.target.value }))}
                placeholder="Ex: Envelopar ata assinada e colher assinatura do cliente Sr. Roberto." style={{ ...fi, minHeight: 80, resize: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Solicitante</label>
                <input type="text" value={solicForm.solicitante_nome} readOnly style={{ ...fi, background: C.bg }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Data</label>
                <input type="date" value={solicForm.data_solicitacao} onChange={e => setSolicForm(o => ({ ...o, data_solicitacao: e.target.value }))} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowAddSolic(false)} style={secBtn()}>Cancelar</button>
              <button onClick={handleAddSolic} style={primBtn()}>Enviar Chamado</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Finalizar Entrega (Motoboy) */}
      {showFinalizeSolic && (
        <Modal title="Finalizar Entrega" onClose={() => setShowFinalizeSolic(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: C.bg, padding: 10, borderRadius: 8, fontSize: 13.5 }}>
              <b>Destino:</b> {showFinalizeSolic.destino} <br/>
              <b>Descrição:</b> {showFinalizeSolic.descricao}
            </div>

            <div>
              <label style={fl}>Data da Conclusão</label>
              <input type="date" value={finalizeForm.data_conclusao} onChange={e => setFinalizeForm(o => ({ ...o, data_conclusao: e.target.value }))} style={fi} />
            </div>

            <div>
              <label style={fl}>Observações do Motoboy</label>
              <textarea 
                value={finalizeForm.obs} onChange={e => setFinalizeForm(o => ({ ...o, obs: e.target.value }))}
                placeholder="Escreva alguma observação relevante, se necessário..." style={{ ...fi, minHeight: 60, resize: "none" }}
              />
            </div>

            <div>
              <label style={fl}>Foto do Protocolo Assinado</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", border: `1px solid ${C.navy}`, borderRadius: 8,
                  background: C.navySoft, color: C.navy, fontWeight: 700, fontSize: 13, cursor: "pointer"
                }}>
                  <Camera size={14} /> Tirar Foto (Câmera)
                  <input 
                    type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                    onChange={e => processImageFile(e, (b64) => setFinalizeForm(o => ({ ...o, foto_protocolo: b64 })))}
                  />
                </label>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 8,
                  background: C.card, color: C.body, fontWeight: 700, fontSize: 13, cursor: "pointer"
                }}>
                  <Upload size={14} /> Anexar Arquivo
                  <input 
                    type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => processImageFile(e, (b64) => setFinalizeForm(o => ({ ...o, foto_protocolo: b64 })))}
                  />
                </label>
              </div>
              
              {finalizeForm.foto_protocolo && (
                <div style={{ marginTop: 10, position: "relative", width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.line}` }}>
                  <img src={finalizeForm.foto_protocolo} alt="Protocolo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button 
                    onClick={() => setFinalizeForm(o => ({ ...o, foto_protocolo: "" }))}
                    style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowFinalizeSolic(null)} style={secBtn()}>Voltar</button>
              <button onClick={handleFinalizeSolic} style={primBtn(C.green)}>Concluir Entrega</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Visualizar Protocolo (Foto) */}
      {showViewProtocol && (
        <Modal title="Protocolo Assinado" onClose={() => setShowViewProtocol(null)}>
          <div style={{ textAlign: "center" }}>
            <img src={showViewProtocol} alt="Protocolo Assinado" style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 8, border: `1px solid ${C.line}` }} />
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setShowViewProtocol(null)} style={primBtn()}>Fechar Visualização</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Novo Abastecimento */}
      {showAddAbast && (
        <Modal title="Lançar Abastecimento" onClose={() => setShowAddAbast(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Data</label>
                <input type="date" value={abastForm.data} onChange={e => setAbastForm(o => ({ ...o, data: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Posto</label>
                <input type="text" value={abastForm.posto} onChange={e => setAbastForm(o => ({ ...o, posto: e.target.value }))} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Custo Total (R$)</label>
                <input type="number" step="0.01" value={abastForm.custo_total} onChange={e => setAbastForm(o => ({ ...o, custo_total: e.target.value }))} placeholder="Ex: 50.00" style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Preço por Litro (R$)</label>
                <input type="number" step="0.001" value={abastForm.preco_litro} onChange={e => setAbastForm(o => ({ ...o, preco_litro: e.target.value }))} placeholder="Ex: 5.99" style={fi} />
              </div>
            </div>
            <div>
              <label style={fl}>KM Atual (Hodômetro)</label>
              <input type="number" value={abastForm.km_atual} onChange={e => setAbastForm(o => ({ ...o, km_atual: e.target.value }))} placeholder={`Km atual (último: ${kmAtual})`} style={fi} />
            </div>
            <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowAddAbast(false)} style={secBtn()}>Cancelar</button>
              <button onClick={handleAddAbast} style={primBtn()}>Lançar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nova Troca de Óleo */}
      {showAddOleo && (
        <Modal title="Lançar Troca de Óleo" onClose={() => setShowAddOleo(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Data</label>
                <input type="date" value={oleoForm.data} onChange={e => setOleoForm(o => ({ ...o, data: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Oficina / Estabelecimento</label>
                <input type="text" value={oleoForm.estabelecimento} onChange={e => setOleoForm(o => ({ ...o, estabelecimento: e.target.value }))} placeholder="Ex: W. Motos" style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Tipo do Óleo</label>
                <input type="text" value={oleoForm.oleo} onChange={e => setOleoForm(o => ({ ...o, oleo: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>KM Atual (Hodômetro)</label>
                <input type="number" value={oleoForm.km_atual} onChange={e => setOleoForm(o => ({ ...o, km_atual: e.target.value }))} placeholder={`KM atual (último: ${kmAtual})`} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Custo Total (R$)</label>
                <input type="number" step="0.01" value={oleoForm.custo_total} onChange={e => setOleoForm(o => ({ ...o, custo_total: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Durabilidade (Km)</label>
                <input type="number" value={oleoForm.km_util} onChange={e => setOleoForm(o => ({ ...o, km_util: e.target.value }))} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 15, marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={oleoForm.filtro_oleo} onChange={e => setOleoForm(o => ({ ...o, filtro_oleo: e.target.checked }))} /> Trocou Filtro de Óleo
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={oleoForm.filtro_combustivel} onChange={e => setOleoForm(o => ({ ...o, filtro_combustivel: e.target.checked }))} /> Trocou Filtro Combustível
              </label>
            </div>
            <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowAddOleo(false)} style={secBtn()}>Cancelar</button>
              <button onClick={handleAddOleo} style={primBtn()}>Lançar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nova Manutenção */}
      {showAddManut && (
        <Modal title="Lançar Manutenção" onClose={() => setShowAddManut(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Data</label>
                <input type="date" value={manutForm.data} onChange={e => setManutForm(o => ({ ...o, data: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Oficina / Mecânica</label>
                <input type="text" value={manutForm.estabelecimento} onChange={e => setManutForm(o => ({ ...o, estabelecimento: e.target.value }))} placeholder="Ex: W. Motos" style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Tipo da Manutenção</label>
                <select value={manutForm.tipo_servico} onChange={e => setManutForm(o => ({ ...o, tipo_servico: e.target.value }))} style={fi}>
                  <option value="Preventiva">Preventiva</option>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Ajuste / Outros">Outros</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>KM no Momento</label>
                <input type="number" value={manutForm.km_atual} onChange={e => setManutForm(o => ({ ...o, km_atual: e.target.value }))} placeholder={`Km (último: ${kmAtual})`} style={fi} />
              </div>
            </div>
            <div>
              <label style={fl}>Descrição das Peças / Serviços</label>
              <textarea 
                value={manutForm.descricao} onChange={e => setManutForm(o => ({ ...o, descricao: e.target.value }))}
                placeholder="Ex: Troca de pastilhas de freio traseira e regulagem de corrente." style={{ ...fi, minHeight: 60, resize: "none" }}
              />
            </div>
            <div>
              <label style={fl}>Custo Total (R$)</label>
              <input type="number" step="0.01" value={manutForm.custo_total} onChange={e => setManutForm(o => ({ ...o, custo_total: e.target.value }))} style={fi} />
            </div>
            <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowAddManut(false)} style={secBtn()}>Cancelar</button>
              <button onClick={handleAddManut} style={primBtn()}>Lançar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar Cadastro de Veículo */}
      {showEditMoto && (
        <Modal title="Editar Dados do Veículo" onClose={() => setShowEditMoto(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Placa</label>
                <input type="text" value={motoForm.placa} onChange={e => setMotoForm(o => ({ ...o, placa: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Fabricante</label>
                <input type="text" value={motoForm.fabricante} onChange={e => setMotoForm(o => ({ ...o, fabricante: e.target.value }))} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Modelo</label>
                <input type="text" value={motoForm.modelo} onChange={e => setMotoForm(o => ({ ...o, modelo: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Ano</label>
                <input type="number" value={motoForm.ano} onChange={e => setMotoForm(o => ({ ...o, ano: e.target.value }))} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={fl}>Óleo Recomendado</label>
                <input type="text" value={motoForm.tipo_oleo} onChange={e => setMotoForm(o => ({ ...o, tipo_oleo: e.target.value }))} style={fi} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fl}>Intervalo Óleo (KM)</label>
                <input type="number" value={motoForm.intervalo_oleo} onChange={e => setMotoForm(o => ({ ...o, intervalo_oleo: e.target.value }))} style={fi} />
              </div>
            </div>
            <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowEditMoto(false)} style={secBtn()}>Cancelar</button>
              <button onClick={handleSaveMoto} style={primBtn()}>Salvar Cadastro</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Subcomponente de Modal Reutilizável localmente
function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(12,22,64,.5)", zIndex: 99999,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "18px 20px", width: 480, maxWidth: "94%",
        maxHeight: "90%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
        boxShadow: "0 12px 40px rgba(12,22,64,.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}`, paddingBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 17.5, fontWeight: 800, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ marginTop: 5 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Estilos Reutilizáveis
const fl = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.body, marginBottom: 4 };
const fi = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.card,
  fontSize: 14, color: C.ink, outline: "none", transition: "border .12s"
};
const primBtn = (bg = C.navy) => ({
  padding: "9px 14px", borderRadius: 7, border: "none", background: bg, color: "#fff",
  fontSize: 13.5, fontWeight: 700, cursor: "pointer"
});
const secBtn = () => ({
  padding: "9px 14px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.card, color: C.body,
  fontSize: 13.5, fontWeight: 700, cursor: "pointer"
});
