const express = require('express');

module.exports = (query) => {
  const router = express.Router();

  // Get all clients
  router.get('/clients', async (_, res) => {
    try {
      const result = await query('SELECT * FROM clients', []);
      const rows = result.rows;
      rows.forEach(r => {
        r.conversazioni = r.conversazioni || [];
      });
      res.json(rows);
    } catch (err) {
      console.error('Errore recupero clienti:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  // Get single client
  router.get('/clients/:id', async (req, res) => {
    try {
      const result = await query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Cliente non trovato' });
      row.conversazioni = row.conversazioni || [];
      res.json(row);
    } catch (err) {
      console.error('Errore recupero cliente:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  // Create client
  router.post('/clients', async (req, res) => {
    const { id_voiceflow } = req.body;
    if (!id_voiceflow) return res.status(400).json({ error: 'ID Voiceflow mancante' });
    try {
      const result = await query(
        "INSERT INTO clients (id_voiceflow, data_modifica) VALUES ($1, NOW()) RETURNING *",
        [id_voiceflow]
      );
      const nuovo = result.rows[0];
      nuovo.conversazioni = [];
      res.status(201).json(nuovo);
    } catch (err) {
      if (err.code === '23505') {
        res.status(400).json({ error: 'ID Voiceflow già esistente' });
      } else {
        console.error('Errore creazione cliente:', err);
        res.status(500).json({ error: 'Errore interno' });
      }
    }
  });

  // Update client
  router.put('/clients/:id', async (req, res) => {
    const { nome, numero, summary, conversazioni } = req.body;
    const updates = [];
    const params = [];
    if (nome !== undefined)          { updates.push('nome = $' + (params.length + 1));          params.push(nome); }
    if (numero !== undefined)        { updates.push('numero = $' + (params.length + 1));        params.push(numero); }
    if (summary !== undefined)       { updates.push('summary = $' + (params.length + 1));       params.push(summary); }
    if (conversazioni !== undefined) { updates.push('conversazioni = $' + (params.length + 1)); params.push(JSON.stringify(conversazioni)); }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    updates.push("data_modifica = NOW()");
    params.push(req.params.id);
    try {
      const result = await query(
        `UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      const updated = result.rows[0];
      if (!updated) {
        res.status(404).json({ error: 'Cliente non trovato' });
      } else {
        updated.conversazioni = updated.conversazioni || [];
        res.json(updated);
      }
    } catch (err) {
      console.error('Errore aggiornamento cliente:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  // Delete client
  router.delete('/clients/:id', async (req, res) => {
    try {
      const result = await query('DELETE FROM clients WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Cliente non trovato' });
      } else {
        res.sendStatus(204);
      }
    } catch (err) {
      console.error('Errore eliminazione cliente:', err);
      res.status(500).json({ error: 'Errore interno' });
    }
  });

  return router;
};
