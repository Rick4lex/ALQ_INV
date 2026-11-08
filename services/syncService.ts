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
  async pushRemoteData(fullState: any, token?: string) {
    try {
      // Usamos text/plain para evadir el OPTIONS preflight error (CORS en Apps Script)
      const payload = {
        action: 'FULL_SYNC',
        token,
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
  },

  // AUTH: Validar credenciales y obtener token de sesión firmado desde Apps Script
  async login(pin: string, requestedRole?: 'admin' | 'vendedor') {
    const cleanPin = pin.trim();
    try {
      const payload = {
        action: 'LOGIN',
        pin: cleanPin,
        role: requestedRole,
        timestamp: Date.now()
      };

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result && typeof result === 'object' && typeof result.success === 'boolean') {
        return result;
      }
      return {
        success: false,
        message: 'Respuesta inesperada del servidor de autenticación.'
      };
    } catch (error) {
      console.warn('Conexión con Apps Script no disponible:', error);
      return {
        success: false,
        message: 'No fue posible conectar con el servidor de autenticación. Verifica tu conexión a internet.'
      };
    }
  },

  // EMAIL: Enviar comprobante de venta por correo vía Google Apps Script
  async sendSaleReceipt(saleData: any, recipientEmail?: string) {
    try {
      const payload = {
        action: 'SEND_SALE_RECEIPT',
        recipientEmail: recipientEmail || 'cfb.dig@gmail.com',
        saleData,
        timestamp: Date.now()
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
      return result;
    } catch (error) {
      console.warn('Fallo enviando comprobante por correo vía Apps Script:', error);
      throw error;
    }
  }
};
