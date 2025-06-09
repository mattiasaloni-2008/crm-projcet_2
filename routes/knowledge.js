const express = require('express');

module.exports = (query) => {
  const router = express.Router();

  function safeParseJSON(str, fallback = []) {
    try {
      if (Array.isArray(str)) return str;
      return str ? JSON.parse(str) : fallback;
    } catch {
      return fallback;
    }
  }

  // Get all knowledge records
  router.get('/knowledge', async (_, res) => {
    try {
      const result = await query('SELECT * FROM knowledge', []);
      const rows = result.rows;
      rows.forEach(r => {
        r.domande = safeParseJSON(r.domande);
        r.domande_finali = safeParseJSON(r.domande_finali);
        if (r.tipo === 'arredo') {
          r.categorie = safeParseJSON(r.categorie);
        }
        if (r.tipo === "complemento d'arredo") {
          r.finiture = safeParseJSON(r.finiture);
        }
      });
      res.json(rows);
    } catch (err) {
      console.error('Errore recupero knowledge:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  // Create knowledge record
  router.post('/knowledge', async (req, res) => {
    const { tipo, nome, descrizione } = req.body;
    if (!tipo || !nome)
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    let prezzo = '', consegna = '', domande = '', categorie = '', finiture = '', domande_finali = '';
    try {
      if (tipo === 'arredo') {
        categorie = JSON.stringify((req.body.categorie || []).map(cat => ({
          titolo: cat.titolo,
          descrizione: cat.descrizione,
          domande: cat.domande || []
        })));
      } else {
        categorie = JSON.stringify([]);
      }
      if (tipo === "complemento d'arredo") {
        finiture = JSON.stringify((req.body.finiture || []).map(fin => ({
          titolo: fin.titolo,
          descrizione: fin.descrizione,
          prezzo: fin.prezzo,
          domande: fin.domande || []
        })));
      } else {
        finiture = JSON.stringify([]);
      }
      prezzo = req.body.prezzo || '';
      consegna = req.body.consegna || '';
      domande = JSON.stringify(req.body.domande || []);
      domande_finali = JSON.stringify(req.body.domande_finali || []);
      const result = await query(
        `INSERT INTO knowledge (tipo, nome, prezzo, consegna, descrizione, domande, categorie, finiture, domande_finali)` +
        ` VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [tipo, nome, prezzo, consegna, descrizione || '', domande, categorie, finiture, domande_finali]
      );
      const newRecord = result.rows[0];
      res.json(newRecord);
    } catch (err) {
      console.error('Errore POST /api/knowledge:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  // Update knowledge record
  router.put('/knowledge/:id', async (req, res) => {
    const { tipo, nome, descrizione } = req.body;
    if (!tipo || !nome)
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    let prezzo = '', consegna = '', domande = '', categorie = '', finiture = '', domande_finali = '';
    try {
      if (tipo === 'arredo') {
        categorie = JSON.stringify((req.body.categorie || []).map(cat => ({
          titolo: cat.titolo,
          descrizione: cat.descrizione,
          domande: cat.domande || []
        })));
      } else {
        categorie = JSON.stringify([]);
      }
      if (tipo === "complemento d'arredo") {
        finiture = JSON.stringify((req.body.finiture || []).map(fin => ({
          titolo: fin.titolo,
          descrizione: fin.descrizione,
          prezzo: fin.prezzo,
          domande: fin.domande || []
        })));
      } else {
        finiture = JSON.stringify([]);
      }
      prezzo = req.body.prezzo || '';
      consegna = req.body.consegna || '';
      domande = JSON.stringify(req.body.domande || []);
      domande_finali = JSON.stringify(req.body.domande_finali || []);
      const result = await query(
        `UPDATE knowledge SET tipo = $1, nome = $2, prezzo = $3, consegna = $4, descrizione = $5, domande = $6, categorie = $7, finiture = $8, domande_finali = $9 WHERE id = $10 RETURNING *`,
        [tipo, nome, prezzo, consegna, descrizione || '', domande, categorie, finiture, domande_finali, req.params.id]
      );
      const updated = result.rows[0];
      if (!updated) {
        res.status(404).json({ error: 'Record knowledge non trovato' });
      } else {
        res.json(updated);
      }
    } catch (err) {
      console.error('Errore PUT /api/knowledge:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  // Delete knowledge record
  router.delete('/knowledge/:id', async (req, res) => {
    try {
      const result = await query('DELETE FROM knowledge WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Record knowledge non trovato' });
      } else {
        res.sendStatus(204);
      }
    } catch (err) {
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  return router;
};
