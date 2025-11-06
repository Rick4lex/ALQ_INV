// ============================================
// utils/diagnostics.ts
// Herramientas de diagnóstico para debugging
// ============================================

import { DataMigrationService } from '../services/DataMigrationService';
import React from 'react';

/**
 * Información completa del sistema
 */
export interface DiagnosticInfo {
  react: {
    version: string;
    mode: string;
  };
  browser: {
    userAgent: string;
    platform: string;
    language: string;
    online: boolean;
  };
  features: {
    [key: string]: boolean;
  };
  storage: {
    localStorage: any;
    indexedDB?: any;
  };
  automerge: {
    documents: number;
    hasLegacyData: boolean;
    hasEmergencyBackup: boolean;
  };
  errors: string[];
  timestamp: string;
}

/**
 * Clase para diagnósticos del sistema
 */
export class Diagnostics {
  /**
   * Recolectar información completa del sistema
   */
  static async collectInfo(): Promise<DiagnosticInfo> {
    const info: DiagnosticInfo = {
      react: {
        version: React.version,
        mode: (import.meta as any).env.MODE || 'unknown',
      },
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        online: navigator.onLine,
      },
      features: await this.checkFeatures(),
      storage: await this.getStorageInfo(),
      automerge: {
        documents: 0,
        hasLegacyData: DataMigrationService.hasLegacyData(),
        hasEmergencyBackup: localStorage.getItem('alkima-mizu-emergency-backup') !== null,
      },
      errors: this.getErrorLogs(),
      timestamp: new Date().toISOString(),
    };

    return info;
  }

  /**
   * Verificar todas las características necesarias
   */
  private static async checkFeatures(): Promise<{ [key: string]: boolean }> {
    return {
      indexedDB: 'indexedDB' in window,
      localStorage: this.testLocalStorage(),
      sessionStorage: this.testSessionStorage(),
      webSocket: 'WebSocket' in window,
      broadcastChannel: 'BroadcastChannel' in window,
      serviceWorker: 'serviceWorker' in navigator,
      promises: 'Promise' in window,
      asyncAwait: (function() {
        try {
          // eslint-disable-next-line no-eval
          eval('(async () => {})');
          return true;
        } catch (e) {
          return false;
        }
      })(),
      fetch: 'fetch' in window,
      proxy: 'Proxy' in window,
    };
  }

  /**
   * Obtener información de storage
   */
  private static async getStorageInfo() {
    const info: any = {
      localStorage: {
        available: false,
        used: 0,
        items: 0,
        keys: [],
      },
    };

    // localStorage
    try {
      info.localStorage.available = true;
      info.localStorage.items = localStorage.length;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          info.localStorage.keys.push(key);
          info.localStorage.used += (key.length + (value?.length || 0)) * 2;
        }
      }
    } catch (e: any) {
      info.localStorage.error = e.message;
    }

    // IndexedDB
    if (navigator.storage && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        info.indexedDB = {
          usage: estimate.usage,
          quota: estimate.quota,
          usagePercentage: estimate.quota 
            ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(2) + '%'
            : 'N/A',
        };
      } catch (e: any) {
        info.indexedDB = { error: e.message };
      }
    }

    return info;
  }

  /**
   * Obtener logs de errores
   */
  private static getErrorLogs(): string[] {
    try {
      const logs = localStorage.getItem('alkima-error-logs');
      if (!logs) return [];
      
      const parsed = JSON.parse(logs);
      return Array.isArray(parsed) 
        ? parsed.map((log: any) => `[${log.timestamp}] ${log.message}`)
        : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Test localStorage
   */
  private static testLocalStorage(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Test sessionStorage
   */
  private static testSessionStorage(): boolean {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Generar reporte HTML
   */
  static async generateHTMLReport(): Promise<string> {
    const info = await this.collectInfo();
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Diagnóstico - Alquima Mizu</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #7C3AED;
      padding-bottom: 10px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
      border-left: 4px solid #7C3AED;
      padding-left: 10px;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status.ok { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .status.warning { background: #fff3cd; color: #856404; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
    }
    .code {
      background: #272822;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    .timestamp {
      color: #888;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Reporte de Diagnóstico</h1>
    <p class="timestamp">Generado: ${info.timestamp}</p>

    <h2>⚛️ React</h2>
    <div class="section">
      <table>
        <tr><th>Versión</th><td>${info.react.version} ${info.react.version.startsWith('18.') ? '<span class="status ok">✓ OK</span>' : '<span class="status error">✗ Versión Incorrecta</span>'}</td></tr>
        <tr><th>Modo</th><td>${info.react.mode}</td></tr>
      </table>
    </div>

    <h2>🌐 Navegador</h2>
    <div class="section">
      <table>
        <tr><th>User Agent</th><td>${info.browser.userAgent}</td></tr>
        <tr><th>Plataforma</th><td>${info.browser.platform}</td></tr>
        <tr><th>Idioma</th><td>${info.browser.language}</td></tr>
        <tr><th>Estado</th><td>${info.browser.online ? '<span class="status ok">✓ Online</span>' : '<span class="status error">✗ Offline</span>'}</td></tr>
      </table>
    </div>

    <h2>✨ Características</h2>
    <div class="section">
      <table>
        ${Object.entries(info.features).map(([feature, available]) => `
          <tr>
            <th>${feature}</th>
            <td>${available ? '<span class="status ok">✓ Disponible</span>' : '<span class="status error">✗ No Disponible</span>'}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <h2>💾 Almacenamiento</h2>
    <div class="section">
      <h3>localStorage</h3>
      <table>
        <tr><th>Disponible</th><td>${info.storage.localStorage.available ? '<span class="status ok">✓ Sí</span>' : '<span class="status error">✗ No</span>'}</td></tr>
        <tr><th>Uso</th><td>${(info.storage.localStorage.used / 1024).toFixed(2)} KB</td></tr>
        <tr><th>Items</th><td>${info.storage.localStorage.items}</td></tr>
      </table>
      
      ${info.storage.indexedDB ? `
        <h3>IndexedDB</h3>
        <table>
          <tr><th>Uso</th><td>${((info.storage.indexedDB.usage || 0) / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Cuota</th><td>${((info.storage.indexedDB.quota || 0) / 1024 / 1024).toFixed(2)} MB</td></tr>
          <tr><th>Porcentaje</th><td>${info.storage.indexedDB.usagePercentage}</td></tr>
        </table>
      ` : ''}
    </div>

    <h2>📦 Automerge</h2>
    <div class="section">
      <table>
        <tr><th>Datos Legacy</th><td>${info.automerge.hasLegacyData ? '<span class="status warning">⚠ Sí (Requiere migración)</span>' : '<span class="status ok">✓ No</span>'}</td></tr>
        <tr><th>Backup Emergencia</th><td>${info.automerge.hasEmergencyBackup ? '<span class="status ok">✓ Disponible</span>' : '<span class="status warning">⚠ No disponible</span>'}</td></tr>
      </table>
    </div>

    ${info.errors.length > 0 ? `
      <h2>❌ Errores Recientes</h2>
      <div class="section">
        <div class="code">
${info.errors.join('\n')}
        </div>
      </div>
    ` : ''}

    <h2>📋 Datos Completos (JSON)</h2>
    <div class="section">
      <div class="code">
<pre><code>${JSON.stringify(info, null, 2)}</code></pre>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Descargar reporte
   */
  static async downloadReport(): Promise<void> {
    const html = await this.generateHTMLReport();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `alkima-diagnostics-${new Date().toISOString().replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imprimir en consola
   */
  static async printToConsole(): Promise<void> {
    const info = await this.collectInfo();
    
    console.group('🔍 DIAGNÓSTICO DEL SISTEMA');
    console.log('Timestamp:', info.timestamp);
    console.groupEnd();

    console.group('⚛️ React');
    console.table(info.react);
    console.groupEnd();

    console.group('🌐 Navegador');
    console.table(info.browser);
    console.groupEnd();

    console.group('✨ Características');
    console.table(info.features);
    console.groupEnd();

    console.group('💾 Almacenamiento');
    console.log('localStorage:', info.storage.localStorage);
    if (info.storage.indexedDB) {
      console.log('IndexedDB:', info.storage.indexedDB);
    }
    console.groupEnd();

    console.group('📦 Automerge');
    console.table(info.automerge);
    console.groupEnd();

    if (info.errors.length > 0) {
      console.group('❌ Errores Recientes');
      info.errors.forEach(error => console.error(error));
      console.groupEnd();
    }
  }
}

/**
 * Comando global para debugging
 * Usar en consola del navegador: window.alkimaDiagnostics()
 */
if (typeof window !== 'undefined') {
  (window as any).alkimaDiagnostics = () => {
    Diagnostics.printToConsole();
    console.log('\n💡 Para descargar reporte completo:');
    console.log('   window.alkimaDownloadReport()');
  };

  (window as any).alkimaDownloadReport = () => {
    Diagnostics.downloadReport();
  };
}

export default Diagnostics;
