import { Product, Movement, AuditLogEntry } from '../types';
import { db } from '../db';

// REEMPLAZA ESTO CON LA URL QUE TE DIO GOOGLE APPS SCRIPT AL IMPLEMENTAR:
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzlF0Zecyxbh3iK01gW00-NGOYCfXhBAjaxz39wg8lIfg8SEETOLz0JNO9k2ThJrOFvRQ/exec'; 

export const syncService = {
  // PULL: Traer datos de Sheets a la Web
  async fetchRemoteData() {
    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error('Error HTTP: ' + response.status);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error obteniendo datos remotos:', error);
      throw error;
    }
  },

  // PUSH: Enviar datos locales hacia Sheets
  async pushRemoteData(fullState: any) {
    try {
      // Usamos text/plain para evadir el OPTIONS preflight error (CORS en Apps Script)
      const payload = {
        action: 'FULL_SYNC',
        data: fullState,
        // Compatibilidad: también incluir propiedades de nivel superior
        ...(typeof fullState === 'object' && fullState !== null ? fullState : {})
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      
      let result: any = null;
      try {
        result = await response.json();
      } catch {
        result = { status: 'success' };
      }

      if (result && result.status && result.status !== 'success' && result.status !== 'ok') {
         throw new Error(result.error || result.message || 'Error desconocido de sincronización');
      }
      return true;
    } catch (error) {
      console.error('Error enviando datos remotos a Google Sheets:', error);
      throw error;
    }
  }
};
