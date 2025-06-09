const express = require('express');

module.exports = (query) => {
  const router = express.Router();

  const verifyChatbotApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'];
    if (!apiKey || apiKey !== process.env.CHATBOT_API_KEY) {
      return res.status(401).json({ error: 'API key non valida o mancante' });
    }
    next();
  };

  function formatVoiceflowResponse(type, data) {
    const parts = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        parts.push(`${key}:${value.join('/')}`);
      } else if (typeof value === 'object' && value !== null) {
        const objParts = [];
        for (const [k, v] of Object.entries(value)) {
          objParts.push(`${k}:${v}`);
        }
        parts.push(`${key}:${objParts.join('/')}`);
      } else {
        parts.push(`${key}:${value}`);
      }
    }
    return `${type}|${parts.join('|')}`;
  }

  function sanitizeString(str) {
    if (!str) return '';
    return String(str)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[{}]/g, '')
      .replace(/^["']|["']$/g, '')
      .trim();
  }

  function safeParseJSON(str, fallback = []) {
    try {
      if (Array.isArray(str)) return str;
      return str ? JSON.parse(str) : fallback;
    } catch {
      return fallback;
    }
  }

  // Get client by Voiceflow ID
  router.get('/chatbot/client/:id_voiceflow', verifyChatbotApiKey, async (req, res) => {
    try {
      const id_voiceflow = req.params.id_voiceflow.replace(/[{}]/g, '');
      const result = await query('SELECT * FROM clients WHERE id_voiceflow = $1', [id_voiceflow]);
      const client = result.rows[0];
      if (!client) {
        return res.status(404).json({ result: 'CLIENTE_NON_TROVATO' });
      }
      client.conversazioni = client.conversazioni || [];
      const response = formatVoiceflowResponse('CLIENTE_TROVATO', {
        id: client.id,
        nome: client.nome || '',
        numero: client.numero || '',
        summary: client.summary || '',
        data: client.data_modifica,
        messaggio: `Cliente trovato: ${client.nome || ''} (${client.numero || 'N/A'})${client.summary ? ' - ' + client.summary : ''}`
      });
      res.json({ result: response });
    } catch (error) {
      console.error('Errore nel recupero del cliente:', error);
      res.status(500).json({ result: 'ERRORE_INTERNO' });
    }
  });

  // Create or update client from chatbot
  router.post('/chatbot/client', verifyChatbotApiKey, async (req, res) => {
    try {
      let { id_voiceflow, nome, numero, summary } = req.body;
      id_voiceflow = sanitizeString(id_voiceflow);
      if (!id_voiceflow) {
        return res.status(400).json({ result: 'ID_VOICEFLOW_MANCANTE' });
      }
      const isZeroValue = (value) => {
        if (!value) return true;
        const cleanValue = String(value).replace(/['"{}]/g, '').trim();
        return cleanValue === '0' || cleanValue === '';
      };
      const selectResult = await query('SELECT * FROM clients WHERE id_voiceflow = $1', [id_voiceflow]);
      const existingClient = selectResult.rows[0];
      if (existingClient) {
        const updates = [];
        const params = [];
        if (!isZeroValue(nome)) {
          nome = sanitizeString(nome);
          updates.push('nome = $' + (params.length + 1));
          params.push(nome);
        }
        if (!isZeroValue(numero)) {
          numero = sanitizeString(numero);
          updates.push('numero = $' + (params.length + 1));
          params.push(numero);
        }
        if (!isZeroValue(summary)) {
          summary = sanitizeString(summary);
          updates.push('summary = $' + (params.length + 1));
          params.push(summary);
        }
        if (updates.length > 0) {
          updates.push('data_modifica = NOW()');
          params.push(id_voiceflow);
          await query(`UPDATE clients SET ${updates.join(', ')} WHERE id_voiceflow = $${params.length}`, params);
        }
      } else {
        await query(
          `INSERT INTO clients (id_voiceflow, nome, numero, summary, conversazioni, data_modifica)` +
          ` VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            id_voiceflow,
            isZeroValue(nome) ? null : sanitizeString(nome),
            isZeroValue(numero) ? null : sanitizeString(numero),
            isZeroValue(summary) ? null : sanitizeString(summary),
            '[]'
          ]
        );
      }
      const clientResult = await query('SELECT * FROM clients WHERE id_voiceflow = $1', [id_voiceflow]);
      const client = clientResult.rows[0];
      const response = formatVoiceflowResponse('CLIENTE_AGGIORNATO', {
        id: client.id,
        nome: client.nome || '',
        numero: client.numero || '',
        summary: client.summary || '',
        data: client.data_modifica,
        messaggio: 'Cliente creato o aggiornato con successo.'
      });
      res.json({ result: response });
    } catch (error) {
      console.error('Errore nel salvataggio del cliente:', error);
      res.status(500).json({ result: 'ERRORE_INTERNO' });
    }
  });

  // Add conversation to client
  router.post('/chatbot/client/conversation', verifyChatbotApiKey, async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ result: 'FORMATO_RICHIESTA_NON_VALIDO' });
      }
      const id_voiceflow = req.body.id_voiceflow ? sanitizeString(req.body.id_voiceflow) : null;
      const user_message = req.body.user_message ? sanitizeString(req.body.user_message) : null;
      const bot_messages = req.body.bot_messages;
      if (!id_voiceflow || !user_message || !bot_messages) {
        return res.status(400).json({ result: 'CAMPI_MANCANTI' });
      }
      let processedBotMessages;
      try {
        if (Array.isArray(bot_messages)) {
          processedBotMessages = bot_messages.map(msg => sanitizeString(msg));
        } else if (typeof bot_messages === 'string') {
          processedBotMessages = bot_messages
            .split('/')
            .map(msg => sanitizeString(msg))
            .filter(msg => msg.length > 0);
        } else {
          processedBotMessages = [sanitizeString(String(bot_messages))];
        }
      } catch (error) {
        return res.status(400).json({ result: 'FORMATO_MESSAGGI_BOT_NON_VALIDO' });
      }
      const selectResult = await query('SELECT * FROM clients WHERE id_voiceflow = $1', [id_voiceflow]);
      const client = selectResult.rows[0];
      if (!client) {
        return res.status(404).json({ result: 'CLIENTE_NON_TROVATO' });
      }
      const currentConversazioni = client.conversazioni || [];
      const newConversation = {
        id: Date.now(),
        user: user_message,
        bot: processedBotMessages
      };
      const updatedConversazioni = [...currentConversazioni, newConversation];
      await query(
        `UPDATE clients SET conversazioni = $1::jsonb, data_modifica = NOW() WHERE id_voiceflow = $2`,
        [JSON.stringify(updatedConversazioni), id_voiceflow]
      );
      const response = formatVoiceflowResponse('CONVERSAZIONE_AGGIUNTA', {
        id: newConversation.id,
        user: newConversation.user,
        bot: newConversation.bot.join('/'),
        messaggio: 'Conversazione salvata con successo.'
      });
      res.json({ result: response });
    } catch (error) {
      console.error('Errore nel salvataggio della conversazione:', error);
      res.status(500).json({ result: 'ERRORE_INTERNO' });
    }
  });

  // Search in knowledge base from chatbot
  router.get('/chatbot/knowledge/search', verifyChatbotApiKey, async (req, res) => {
    try {
      let tipo = req.query.tipo || req.query.Tipo;
      tipo = sanitizeString(tipo);
      if (!tipo) {
        return res.status(400).json({ result: 'TIPO_MANCANTE' });
      }
      const allDataResult = await query('SELECT * FROM knowledge', []);
      const allData = allDataResult.rows;
      let results = allData.filter(item => {
        const itemTipo = sanitizeString(item.tipo);
        return itemTipo === tipo;
      });
      if (results.length === 0) {
        return res.status(404).json({ result: 'NESSUN_PRODOTTO_TROVATO' });
      }
      const formattedResults = results.map(row => {
        const domande = safeParseJSON(row.domande);
        const domande_finali = safeParseJSON(row.domande_finali);
        const categorie = safeParseJSON(row.categorie);
        const finiture = safeParseJSON(row.finiture);
        const productDetails = {
          id: row.id,
          tipo: sanitizeString(row.tipo),
          nome: sanitizeString(row.nome),
          descrizione: sanitizeString(row.descrizione) || '',
          prezzo: sanitizeString(row.prezzo) || '',
          consegna: sanitizeString(row.consegna) || '',
          domande: domande.map(d => sanitizeString(d)).join('/'),
          domande_finali: domande_finali.map(d => sanitizeString(d)).join('/')
        };
        if (row.tipo === 'arredo' && Array.isArray(categorie)) {
          productDetails.categorie_dettaglio = categorie.map(c => {
            return `${sanitizeString(c.titolo)}:${sanitizeString(c.descrizione)}:${Array.isArray(c.domande) ? c.domande.map(d => sanitizeString(d)).join(',') : ''}`;
          }).join('/');
        } else if (row.tipo === "complemento d'arredo" && Array.isArray(finiture)) {
          productDetails.finiture_dettaglio = finiture.map(f => {
            return `${sanitizeString(f.titolo)}:${sanitizeString(f.descrizione)}:${sanitizeString(f.prezzo)}:${Array.isArray(f.domande) ? f.domande.map(d => sanitizeString(d)).join(',') : ''}`;
          }).join('/');
        }
        const parts = [];
        for (const [key, value] of Object.entries(productDetails)) {
          if (value) {
            parts.push(`${key}:${value}`);
          }
        }
        return `PRODOTTO_TROVATO|${parts.join('|')}`;
      });
      const responseString = formattedResults.join('|||');
      res.json({ result: responseString });
    } catch (error) {
      console.error('Errore nella ricerca:', error);
      res.status(500).json({ result: 'ERRORE_INTERNO' });
    }
  });

  return router;
};
