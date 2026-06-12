import { useState, useEffect, useMemo } from "react";
import { 
  Trash2, Plus, Search, Download, Loader, AlertTriangle, 
  Eye, EyeOff, ShieldCheck, Check, X, Folder, Key, Lock,
  Terminal, FileCode, ExternalLink, Info, HelpCircle
} from "lucide-react";

import { 
  obterCertificadosCNPJ, 
  obterCertificadosCPF, 
  excluirCertificado, 
  uploadCertificado, 
  obterDownloadCertificadoUrl,
  obterHelperScriptUrl,
  obterHelperRegUrl
} from "./api";

// Constantes de Cores para coerência estética
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

export default function Certificados({ me, active }) {
  const [activeTab, setActiveTab] = useState("DASHBOARD"); // "DASHBOARD", "CNPJ", "CPF" ou "INSTALADOS"
  const [certs, setCerts] = useState([]);
  const [allCerts, setAllCerts] = useState({ cnpj: [], cpf: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Exibição de senhas (dicionário de id -> booleano para mostrar)
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Modais
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPassword, setUploadPassword] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Carregar dados
  const loadCerts = async () => {
    if (activeTab === "INSTALADOS") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "DASHBOARD") {
        const [cnpjData, cpfData] = await Promise.all([
          obterCertificadosCNPJ(""),
          obterCertificadosCPF("")
        ]);
        setAllCerts({ cnpj: cnpjData, cpf: cpfData });
      } else if (activeTab === "CNPJ") {
        const data = await obterCertificadosCNPJ(search);
        setCerts(data);
      } else if (activeTab === "CPF") {
        const data = await obterCertificadosCPF(search);
        setCerts(data);
      }
    } catch (err) {
      console.error("Erro ao carregar certificados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadCerts();
    }
  }, [activeTab, search, active]);

  // Função para toggle de visibilidade de senha
  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Instalação de Certificado no Windows local via Protocolo Personalizado
  const handleInstallSO = (c) => {
    const file = c.caminho_arquivo || "";
    const password = c.senha || "";
    const name = c.nome || "";
    
    if (!file) {
      alert("Caminho do arquivo do certificado não especificado.");
      return;
    }
    
    const protocolUrl = `contabilizare://install?file=${encodeURIComponent(file)}&password=${encodeURIComponent(password)}&name=${encodeURIComponent(name)}`;
    window.location.href = protocolUrl;
  };

  // Abrir pasta contendo o certificado no explorer local via Protocolo Personalizado
  const handleOpenFolder = (c) => {
    const file = c.caminho_arquivo || "";
    
    if (!file) {
      alert("Caminho do arquivo do certificado não especificado.");
      return;
    }
    
    const protocolUrl = `contabilizare://open?file=${encodeURIComponent(file)}`;
    window.location.href = protocolUrl;
  };

  // Envio de Upload de arquivo
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Por favor, selecione um arquivo de certificado .pfx ou .p12");
      return;
    }
    if (!uploadPassword) {
      setUploadError("Por favor, digite a senha do certificado");
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const res = await uploadCertificado(uploadFile, uploadPassword);
      setUploadSuccess(res.message || "Certificado importado com sucesso!");
      setUploadFile(null);
      setUploadPassword("");
      
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess("");
        loadCerts();
      }, 2000);
    } catch (err) {
      setUploadError(err.message || "Erro ao enviar certificado.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Estilização do status
  const renderStatusBadge = (status, dias) => {
    if (status === "expirado") {
      return (
        <span style={{
          background: C.redSoft, color: C.red, padding: "4px 8px", 
          borderRadius: 6, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4
        }}>
          <AlertTriangle size={13} /> Expirado ({dias}d)
        </span>
      );
    } else if (status === "alerta") {
      return (
        <span style={{
          background: C.amberSoft, color: C.amber, padding: "4px 8px", 
          borderRadius: 6, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4
        }}>
          <AlertTriangle size={13} /> Vence em breve ({dias}d)
        </span>
      );
    } else {
      return (
        <span style={{
          background: C.greenSoft, color: C.green, padding: "4px 8px", 
          borderRadius: 6, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4
        }}>
          <Check size={13} /> Válido ({dias}d)
        </span>
      );
    }
  };

  // Cálculos do Dashboard Geral de Certificados
  const totalCertsList = useMemo(() => {
    return [...allCerts.cnpj, ...allCerts.cpf];
  }, [allCerts]);

  const stats = useMemo(() => {
    const totalCNPJ = allCerts.cnpj.length;
    const totalCPF = allCerts.cpf.length;
    const expirados = totalCertsList.filter(c => c.status_calculado === "expirado").length;
    const alerta = totalCertsList.filter(c => c.status_calculado === "alerta").length;
    const validados = totalCertsList.filter(c => c.status_calculado === "valido").length;
    const total = totalCertsList.length;
    return { totalCNPJ, totalCPF, expirados, alerta, validados, total };
  }, [allCerts, totalCertsList]);

  const expirationTimelineData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const today = new Date();
    const result = [];
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const mIdx = d.getMonth();
      const year = d.getFullYear();
      const label = `${months[mIdx]}/${String(year).substring(2)}`;
      
      const count = totalCertsList.filter(c => {
        if (!c.vencimento) return false;
        try {
          const parts = c.vencimento.split("/");
          const certMonth = parseInt(parts[1], 10) - 1;
          const certYear = parseInt(parts[2], 10);
          return certMonth === mIdx && certYear === year;
        } catch (e) {
          return false;
        }
      }).length;
      
      result.push({ label, count });
    }
    return result;
  }, [totalCertsList]);

  const criticalCerts = useMemo(() => {
    return totalCertsList
      .filter(c => c.dias_restantes !== null)
      .sort((a, b) => a.dias_restantes - b.dias_restantes)
      .slice(0, 5);
  }, [totalCertsList]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={26} color={C.navy} /> Controle de Certificados Digitais
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: 13.5, color: C.muted }}>
            Gerencie, instale no Windows, pesquise chaves locais e monitore as credenciais digitais.
          </p>
        </div>
        
        <button 
          onClick={() => setShowUploadModal(true)}
          style={{
            background: C.navy, color: "#fff", border: "none", padding: "10px 18px", 
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", 
            display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(22, 34, 74, 0.15)"
          }}
        >
          <Plus size={16} /> Importar Certificado (.pfx)
        </button>
      </div>

      {/* Abas e Busca */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}`, paddingBottom: 1 }}>
        <div style={{ display: "flex", gap: 24 }}>
          <button 
            onClick={() => { setActiveTab("DASHBOARD"); }}
            style={{
              background: "none", border: "none", padding: "12px 4px", fontSize: 15, 
              fontWeight: 700, color: activeTab === "DASHBOARD" ? C.navy : C.muted, 
              borderBottom: activeTab === "DASHBOARD" ? `3px solid ${C.navy}` : "3px solid transparent",
              cursor: "pointer", transition: "all .2s"
            }}
          >
            Painel Geral
          </button>
          <button 
            onClick={() => { setActiveTab("CNPJ"); setVisiblePasswords({}); }}
            style={{
              background: "none", border: "none", padding: "12px 4px", fontSize: 15, 
              fontWeight: 700, color: activeTab === "CNPJ" ? C.navy : C.muted, 
              borderBottom: activeTab === "CNPJ" ? `3px solid ${C.navy}` : "3px solid transparent",
              cursor: "pointer", transition: "all .2s"
            }}
          >
            Pessoa Jurídica (CNPJ)
          </button>
          <button 
            onClick={() => { setActiveTab("CPF"); setVisiblePasswords({}); }}
            style={{
              background: "none", border: "none", padding: "12px 4px", fontSize: 15, 
              fontWeight: 700, color: activeTab === "CPF" ? C.navy : C.muted, 
              borderBottom: activeTab === "CPF" ? `3px solid ${C.navy}` : "3px solid transparent",
              cursor: "pointer", transition: "all .2s"
            }}
          >
            Pessoa Física (CPF)
          </button>
          <button 
            onClick={() => { setActiveTab("INSTALADOS"); }}
            style={{
              background: "none", border: "none", padding: "12px 4px", fontSize: 15, 
              fontWeight: 700, color: activeTab === "INSTALADOS" ? C.navy : C.muted, 
              borderBottom: activeTab === "INSTALADOS" ? `3px solid ${C.navy}` : "3px solid transparent",
              cursor: "pointer", transition: "all .2s"
            }}
          >
            Instalados no Computador (Windows)
          </button>
        </div>

        {/* Campo de Busca */}
        {activeTab !== "DASHBOARD" && (
          <div style={{ position: "relative", width: 280 }}>
            <Search size={16} color={C.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              placeholder={activeTab === "INSTALADOS" ? "Buscar por assunto/thumb..." : "Buscar razão/nome ou doc..."} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px 8px 34px", borderRadius: 8, 
                border: `1px solid ${C.line}`, fontSize: 13.5, background: "#fff", outline: "none",
                color: C.ink, transition: "border .2s"
              }}
            />
          </div>
        )}
      </div>

      {/* Listagem */}
      <div style={{ flex: 1, overflowY: "auto", background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>
        {loading ? (
          <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justify: "center", gap: 12 }}>
            <Loader size={28} className="animate-spin" color={C.navy} />
            <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>Buscando certificados...</span>
          </div>
        ) : activeTab === "DASHBOARD" ? (
          /* Painel Geral (Dashboard) */
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000, margin: "0 auto", width: "100%" }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Total Pessoa Jurídica (CNPJ)</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4 }}>{stats.totalCNPJ}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Total Pessoa Física (CPF)</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 4 }}>{stats.totalCPF}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Vencendo em breve (&le; 30 dias)</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: stats.alerta > 0 ? C.amber : C.ink, marginTop: 4 }}>{stats.alerta}</div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Certificados Expirados</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: stats.expirados > 0 ? C.red : C.ink, marginTop: 4 }}>{stats.expirados}</div>
              </div>
            </div>

            {/* Gráficos em Duas Colunas */}
            <div style={{ display: "flex", gap: 20 }}>
              {/* Gráfico Donut de Status */}
              <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 13, alignSelf: "flex-start", width: "100%" }}>📊 Proporção de Validade</div>
                {stats.total === 0 ? (
                  <div style={{ height: 180, display: "flex", alignItems: "center", justify: "center", justifyContent: "center", color: C.muted }}>
                    Nenhum certificado cadastrado.
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%", justifyContent: "center", marginTop: 8 }}>
                    {/* SVG Donut */}
                    <div style={{ position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)", position: "absolute", left: 0, top: 0 }}>
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke={C.line} strokeWidth="10" />
                        {stats.validados > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="transparent"
                            stroke={C.green}
                            strokeWidth="10"
                            strokeDasharray={`${(stats.validados / stats.total) * 314.16} 314.16`}
                            strokeDashoffset={0}
                          />
                        )}
                        {stats.alerta > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="transparent"
                            stroke={C.amber}
                            strokeWidth="10"
                            strokeDasharray={`${(stats.alerta / stats.total) * 314.16} 314.16`}
                            strokeDashoffset={-((stats.validados / stats.total) * 314.16)}
                          />
                        )}
                        {stats.expirados > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="transparent"
                            stroke={C.red}
                            strokeWidth="10"
                            strokeDasharray={`${(stats.expirados / stats.total) * 314.16} 314.16`}
                            strokeDashoffset={-(((stats.validados + stats.alerta) / stats.total) * 314.16)}
                          />
                        )}
                      </svg>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{stats.total}</span>
                        <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>Total</span>
                      </div>
                    </div>

                    {/* Legenda do Gráfico */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: C.green }} />
                        <span style={{ fontSize: 12.5, color: C.body, fontWeight: 600 }}>Válidos: <strong>{stats.validados}</strong></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: C.amber }} />
                        <span style={{ fontSize: 12.5, color: C.body, fontWeight: 600 }}>Alerta: <strong>{stats.alerta}</strong></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: C.red }} />
                        <span style={{ fontSize: 12.5, color: C.body, fontWeight: 600 }}>Expirados: <strong>{stats.expirados}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cronograma de Vencimento */}
              <div style={{ flex: 1.2, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>📈 Vencimentos nos Próximos 6 Meses</div>
                {stats.total === 0 ? (
                  <div style={{ height: 180, display: "flex", alignItems: "center", justify: "center", justifyContent: "center", color: C.muted }}>
                    Nenhum cronograma disponível.
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                    <svg width="100%" height="130" viewBox="0 0 300 130" style={{ overflow: "visible" }}>
                      <line x1="10" y1="100" x2="290" y2="100" stroke={C.line} strokeWidth="1" />
                      {(() => {
                        const maxCount = Math.max(...expirationTimelineData.map(d => d.count), 1);
                        return expirationTimelineData.map((d, i) => {
                          const x = 20 + i * 45;
                          const barHeight = (d.count / maxCount) * 80; // max height is 80px
                          const y = 100 - barHeight;
                          return (
                            <g key={d.label}>
                              {d.count > 0 && (
                                <text x={x + 10} y={y - 6} textAnchor="middle" style={{ fontSize: 10, fill: C.navy, fontWeight: 700 }}>
                                  {d.count}
                                </text>
                              )}
                              <rect
                                x={x}
                                y={y}
                                width="20"
                                height={barHeight || 1}
                                rx="3"
                                style={{
                                  fill: d.count > 0 ? C.navy : C.navySoft,
                                  transition: "height 0.4s ease, y 0.4s ease"
                                }}
                              />
                              <text x={x + 10} y="116" textAnchor="middle" style={{ fontSize: 9.5, fill: C.muted, fontWeight: 600 }}>
                                {d.label}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Próximos Vencimentos */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, fontWeight: 700, color: C.navy, fontSize: 13 }}>
                ⏳ Próximos Vencimentos Críticos
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.line}` }}>
                      <th style={{ padding: "10px 16px", color: C.navy, fontWeight: 700 }}>Nome / Razão Social</th>
                      <th style={{ padding: "10px 16px", color: C.navy, fontWeight: 700 }}>Vencimento</th>
                      <th style={{ padding: "10px 16px", color: C.navy, fontWeight: 700 }}>Status</th>
                      <th style={{ padding: "10px 16px", color: C.navy, fontWeight: 700, textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalCerts.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 20, textAlign: "center", color: C.muted }}>Nenhum certificado a vencer cadastrado.</td>
                      </tr>
                    ) : (
                      criticalCerts.map((c) => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: C.ink }}>{c.nome}</td>
                          <td style={{ padding: "12px 16px", color: C.body }}>{c.vencimento}</td>
                          <td style={{ padding: "12px 16px" }}>{renderStatusBadge(c.status_calculado, c.dias_restantes)}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 8 }}>
                              <button 
                                onClick={() => handleInstallSO(c)}
                                title="Instalar no Windows"
                                style={{
                                  background: C.navySoft, color: C.navy, border: "none", padding: 6, 
                                  borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center"
                                }}
                              >
                                <Key size={14} />
                              </button>
                              <button 
                                onClick={() => handleOpenFolder(c)}
                                title="Abrir pasta do arquivo local"
                                style={{
                                  background: C.navySoft, color: C.navy, border: "none", padding: 6, 
                                  borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center"
                                }}
                              >
                                <Folder size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "INSTALADOS" ? (
          /* Aba de Instruções e Integração Local do Computador */
          <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {/* Header explicativo */}
            <div style={{ display: "flex", gap: 16, background: C.navySoft, padding: 20, borderRadius: 12, borderLeft: `4px solid ${C.navy}` }}>
              <Info size={24} color={C.navy} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 700, color: C.navy }}>Integração Local do Computador</h4>
                <p style={{ margin: 0, fontSize: 13.5, color: C.body, lineHeight: 1.5 }}>
                  Para poder abrir pastas físicas da rede e instalar certificados diretamente no seu computador local, é necessário configurar um protocolo seguro no Windows da sua máquina local. Isto é necessário devido às políticas de segurança padrão do navegador (Chrome, Edge, Firefox).
                </p>
              </div>
            </div>

            {/* Grid de dois cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Card Esquerda: Download de arquivos */}
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 16 }}>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileCode size={18} color={C.navy} /> 1. Arquivos de Configuração
                </h5>
                <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>
                  Baixe ambos os arquivos no seu computador local para realizar a configuração.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  <a 
                    href={obterHelperScriptUrl()}
                    download="contabilizare_helper.ps1"
                    style={{
                      display: "flex", alignItems: "center", justify: "space-between", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: 8, background: C.bg, border: `1px solid ${C.line}`,
                      color: C.ink, textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = C.navy}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = C.line}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Terminal size={16} color={C.muted} />
                      contabilizare_helper.ps1
                    </span>
                    <Download size={15} color={C.navy} />
                  </a>

                  <a 
                    href={obterHelperRegUrl()}
                    download="registrar_protocolo.reg"
                    style={{
                      display: "flex", alignItems: "center", justify: "space-between", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: 8, background: C.bg, border: `1px solid ${C.line}`,
                      color: C.ink, textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = C.navy}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = C.line}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileCode size={16} color={C.muted} />
                      registrar_protocolo.reg
                    </span>
                    <Download size={15} color={C.navy} />
                  </a>
                </div>
              </div>

              {/* Card Direita: Instruções passo-a-passo */}
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 12 }}>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  <HelpCircle size={18} color={C.navy} /> 2. Passo a Passo para Instalar
                </h5>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.body, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li>Crie uma pasta vazia chamada <strong style={{ color: C.ink }}>C:\Contabilizare</strong> no seu computador.</li>
                  <li>Mova o arquivo baixado <strong style={{ color: C.ink }}>contabilizare_helper.ps1</strong> para dentro dessa pasta.</li>
                  <li>Dê um duplo clique no arquivo <strong style={{ color: C.ink }}>registrar_protocolo.reg</strong> e clique em <strong>Sim</strong> quando solicitado para importar ao Registro do Windows.</li>
                  <li>Pronto! O navegador agora chamará as ações diretamente no seu Windows.</li>
                </ol>
              </div>
            </div>

            {/* Gerenciamento local */}
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink }}>Gerenciar Certificados Instalados no Windows</h5>
                <p style={{ margin: "4px 0 0 0", fontSize: 12.5, color: C.muted }}>
                  Abra a ferramenta nativa de gerenciamento de certificados do Windows do seu computador para verificar e gerenciar suas chaves pessoais.
                </p>
              </div>
              <button
                onClick={() => window.location.href = "contabilizare://open-certmgr"}
                style={{
                  background: C.navy, color: "#fff", border: "none", padding: "10px 18px",
                  borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s",
                  boxShadow: "0 2px 6px rgba(22, 34, 74, 0.1)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.navyDeep}
                onMouseLeave={(e) => e.currentTarget.style.background = C.navy}
              >
                Abrir certmgr.msc <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Tabela Padrão (CNPJ / CPF) */
          certs.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justify: "center", gap: 12, color: C.muted }}>
              <ShieldCheck size={40} strokeWidth={1.2} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Nenhum certificado cadastrado encontrado</span>
              <span style={{ fontSize: 12.5 }}>Clique em "Importar Certificado" para cadastrar seu primeiro registro.</span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: C.navySoft, borderBottom: `1px solid ${C.line}` }}>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Nome / Razão Social</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>{activeTab}</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Vencimento</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Senha</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: C.ink }}>{c.nome}</td>
                      <td style={{ padding: "14px 16px", color: C.body, fontFamily: "monospace" }}>{c.identificador}</td>
                      <td style={{ padding: "14px 16px", color: C.body }}>{c.vencimento}</td>
                      <td style={{ padding: "14px 16px" }}>{renderStatusBadge(c.status_calculado, c.dias_restantes)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 14, color: C.body, letterSpacing: visiblePasswords[c.id] ? "normal" : "2px" }}>
                            {visiblePasswords[c.id] ? c.senha : "••••••••"}
                          </span>
                          <button 
                            onClick={() => togglePasswordVisibility(c.id)}
                            style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: C.muted, display: "flex", alignItems: "center" }}
                          >
                            {visiblePasswords[c.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button 
                            onClick={() => handleInstallSO(c)}
                            title="Instalar no Windows"
                            style={{
                              background: C.navySoft, color: C.navy, border: "none", padding: 6, 
                              borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center"
                            }}
                          >
                            <Key size={14} />
                          </button>
                          <button 
                            onClick={() => handleOpenFolder(c)}
                            title="Abrir pasta do arquivo local"
                            style={{
                              background: C.navySoft, color: C.navy, border: "none", padding: 6, 
                              borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center"
                            }}
                          >
                            <Folder size={14} />
                          </button>
                          <a 
                            href={obterDownloadCertificadoUrl(activeTab, c.id)}
                            download
                            title="Baixar arquivo PFX"
                            style={{
                              background: C.navySoft, color: C.navy, border: "none", padding: 6, 
                              borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center"
                            }}
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal de Upload */}
      {showUploadModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(12, 22, 64, 0.4)", zIndex: 100, display: "flex", 
          alignItems: "center", justifyContent: "center", animation: "fade .2s ease"
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, width: "100%", maxWidth: 450, 
            padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Importar Certificado Digital</span>
              <button 
                onClick={() => { setShowUploadModal(false); setUploadError(""); setUploadSuccess(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Dropzone / File input */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.body }}>Arquivo do Certificado (.pfx, .p12)</span>
                <div 
                  style={{
                    border: `2px dashed ${uploadFile ? C.green : C.line}`,
                    borderRadius: 12, padding: "24px 16px", textAlign: "center",
                    background: uploadFile ? C.greenSoft + "22" : C.bg,
                    cursor: "pointer", position: "relative"
                  }}
                >
                  <input 
                    type="file" 
                    accept=".pfx,.p12"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                      opacity: 0, cursor: "pointer"
                    }}
                  />
                  <ShieldCheck size={32} color={uploadFile ? C.green : C.muted} style={{ margin: "0 auto 8px" }} />
                  {uploadFile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.green }}>{uploadFile.name}</span>
                      <span style={{ fontSize: 11.5, color: C.muted }}>{(uploadFile.size / 1024).toFixed(1)} KB - Clique para alterar</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>Arraste ou clique para selecionar</span>
                      <span style={{ fontSize: 11.5, color: C.muted }}>Formatos suportados: PFX ou P12</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.body }}>Senha do Certificado</span>
                <div style={{ position: "relative" }}>
                  <Lock size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    type="password" 
                    placeholder="Digite a senha de instalação"
                    value={uploadPassword}
                    onChange={(e) => setUploadPassword(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8,
                      border: `1px solid ${C.line}`, outline: "none", fontSize: 13.5, color: C.ink
                    }}
                  />
                </div>
              </div>

              {/* Mensagens de Feedback */}
              {uploadError && (
                <div style={{
                  background: C.redSoft, color: C.red, padding: "10px 12px", 
                  borderRadius: 8, fontSize: 12.5, display: "flex", alignItems: "center", gap: 8
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div style={{
                  background: C.greenSoft, color: C.green, padding: "10px 12px", 
                  borderRadius: 8, fontSize: 12.5, display: "flex", alignItems: "center", gap: 8
                }}>
                  <Check size={15} style={{ flexShrink: 0 }} />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Ações */}
              <div style={{ display: "flex", justify: "flex-end", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                <button 
                  type="button"
                  disabled={uploadLoading}
                  onClick={() => { setShowUploadModal(false); setUploadError(""); setUploadSuccess(""); }}
                  style={{
                    background: "none", border: `1px solid ${C.line}`, padding: "9px 16px", 
                    borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: C.body, cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploadLoading}
                  style={{
                    background: C.navy, color: "#fff", border: "none", padding: "9px 18px", 
                    borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8
                  }}
                >
                  {uploadLoading ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
