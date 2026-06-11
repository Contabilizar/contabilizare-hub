import { useState, useEffect, useMemo } from "react";
import { 
  Trash2, Plus, Search, Download, Loader, AlertTriangle, 
  Eye, EyeOff, ShieldCheck, Check, X, Folder, Key
} from "lucide-react";

import { 
  obterCertificadosCNPJ, 
  obterCertificadosCPF, 
  excluirCertificado, 
  uploadCertificado, 
  obterDownloadCertificadoUrl,
  instalarCertificadoNoSO,
  abrirPastaCertificado,
  obterCertificadosInstaladosNoSO,
  desinstalarCertificadoNoSO
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
  const [activeTab, setActiveTab] = useState("CNPJ"); // "CNPJ", "CPF" ou "INSTALADOS"
  const [certs, setCerts] = useState([]);
  const [installedCerts, setInstalledCerts] = useState([]);
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
    setLoading(true);
    try {
      if (activeTab === "CNPJ") {
        const data = await obterCertificadosCNPJ(search);
        setCerts(data);
      } else if (activeTab === "CPF") {
        const data = await obterCertificadosCPF(search);
        setCerts(data);
      } else if (activeTab === "INSTALADOS") {
        let data = await obterCertificadosInstaladosNoSO();
        if (search) {
          data = data.filter(c => 
            c.nome.toLowerCase().includes(search.toLowerCase()) || 
            c.thumbprint.toLowerCase().includes(search.toLowerCase())
          );
        }
        setInstalledCerts(data);
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

  // Instalação de Certificado no Windows local
  const handleInstallSO = async (id, nome) => {
    try {
      const res = await instalarCertificadoNoSO(activeTab, id);
      alert(res.message || `Certificado de "${nome}" instalado com sucesso no Windows!`);
    } catch (err) {
      alert(err.message || "Erro ao instalar certificado no Windows.");
    }
  };

  // Abrir pasta contendo o certificado no explorer do host
  const handleOpenFolder = async (id) => {
    try {
      await abrirPastaCertificado(activeTab, id);
    } catch (err) {
      alert(err.message || "Erro ao abrir pasta contendo o certificado.");
    }
  };

  // Desinstalar certificado do Windows local por thumbprint
  const handleUninstallSO = async (thumbprint, nome) => {
    if (!window.confirm(`Deseja realmente remover o certificado "${nome}" das chaves locais do Windows?`)) {
      return;
    }
    try {
      const res = await desinstalarCertificadoNoSO(thumbprint);
      alert(res.message || "Certificado desinstalado do Windows com sucesso.");
      loadCerts();
    } catch (err) {
      alert(err.message || "Erro ao desinstalar certificado do Windows.");
    }
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
      </div>

      {/* Listagem */}
      <div style={{ flex: 1, overflowY: "auto", background: C.card, borderRadius: 12, border: `1px solid ${C.line}` }}>
        {loading ? (
          <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justify: "center", gap: 12 }}>
            <Loader size={28} className="animate-spin" color={C.navy} />
            <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>Buscando certificados...</span>
          </div>
        ) : activeTab === "INSTALADOS" ? (
          /* Tabela de Certificados Instalados no SO */
          installedCerts.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justify: "center", gap: 12, color: C.muted }}>
              <ShieldCheck size={40} strokeWidth={1.2} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Nenhum certificado instalado encontrado no Windows</span>
              <span style={{ fontSize: 12.5 }}>Certificados instalados no repositório local do usuário serão listados aqui.</span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: C.navySoft, borderBottom: `1px solid ${C.line}` }}>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Assunto (Subject)</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Thumbprint</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700 }}>Validade</th>
                    <th style={{ padding: "12px 16px", color: C.navy, fontWeight: 700, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {installedCerts.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: C.ink }}>{c.nome}</td>
                      <td style={{ padding: "14px 16px", color: C.body, fontFamily: "monospace", fontSize: 12.5 }}>{c.thumbprint}</td>
                      <td style={{ padding: "14px 16px", color: C.body }}>{c.validade}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button 
                          onClick={() => handleUninstallSO(c.thumbprint, c.nome)}
                          title="Remover do Windows"
                          style={{
                            background: "#fee2e2", color: C.red, border: "none", padding: 6, 
                            borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
                            onClick={() => handleInstallSO(c.id, c.nome)}
                            title="Instalar no Windows"
                            style={{
                              background: C.navySoft, color: C.navy, border: "none", padding: 6, 
                              borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center"
                            }}
                          >
                            <Key size={14} />
                          </button>
                          <button 
                            onClick={() => handleOpenFolder(c.id)}
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
