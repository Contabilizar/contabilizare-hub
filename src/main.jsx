import React from 'react'
import ReactDOM from 'react-dom/client'

// Injeção do storage global para salvar tudo no SQLite centralizado do servidor local
if (typeof window !== "undefined") {
  const originalStorage = window.storage; // Salva o storage original (do wrapper webview)
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  
  window.storage = {
    get: async (key, isGlobal) => {
      // Se não for uma chave global (isGlobal === false), busca apenas localmente
      if (!isGlobal) {
        if (originalStorage && typeof originalStorage.get === "function") {
          return await originalStorage.get(key, false);
        }
        if (typeof window.localStorage !== "undefined") {
          const val = window.localStorage.getItem(key);
          return val ? { value: val } : null;
        }
        return null;
      }
      
      // Para chaves globais, busca no banco centralizado
      try {
        const res = await fetch(`${API_BASE}/state/${encodeURIComponent(key)}`);
        if (res.status === 404) {
          // Se não estiver no banco centralizado, tenta migrar do storage local antigo
          if (originalStorage && typeof originalStorage.get === "function") {
            const localVal = await originalStorage.get(key, true);
            if (localVal && localVal.value) {
              console.log("Migrando chave do storage local (webview) para o banco centralizado:", key);
              await window.storage.set(key, localVal.value, true);
              return { value: localVal.value };
            }
          }
          if (typeof window.localStorage !== "undefined") {
            const localVal = window.localStorage.getItem(key);
            if (localVal) {
              console.log("Migrando chave do localStorage (navegador) para o banco centralizado:", key);
              await window.storage.set(key, localVal, true);
              return { value: localVal };
            }
          }
          return null;
        }
        if (!res.ok) throw new Error("Erro na API");
        const data = await res.json();
        return { value: data.value };
      } catch (err) {
        console.error("Erro ao ler chave de estado:", key, err);
        return null;
      }
    },
    set: async (key, value, isGlobal) => {
      // Se não for global, salva apenas localmente
      if (!isGlobal) {
        if (originalStorage && typeof originalStorage.set === "function") {
          return await originalStorage.set(key, value, false);
        }
        if (typeof window.localStorage !== "undefined") {
          window.localStorage.setItem(key, value);
          return true;
        }
        return false;
      }
      
      // Para chaves globais, salva no banco centralizado
      try {
        const res = await fetch(`${API_BASE}/state/${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: value })
        });
        if (!res.ok) throw new Error("Erro na API");
        return true;
      } catch (err) {
        console.error("Erro ao salvar chave de estado:", key, err);
        return false;
      }
    },
    delete: async (key, isGlobal) => {
      // Se não for global, deleta apenas localmente
      if (!isGlobal) {
        if (originalStorage && typeof originalStorage.delete === "function") {
          return await originalStorage.delete(key, false);
        }
        if (typeof window.localStorage !== "undefined") {
          window.localStorage.removeItem(key);
          return true;
        }
        return false;
      }
      
      // Para chaves globais, deleta no banco centralizado
      try {
        const res = await fetch(`${API_BASE}/state/${encodeURIComponent(key)}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Erro na API");
        return true;
      } catch (err) {
        console.error("Erro ao remover chave de estado:", key, err);
        return false;
      }
    }
  };
}

import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
