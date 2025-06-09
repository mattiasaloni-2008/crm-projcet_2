-- Schema for CRM project

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    id_voiceflow TEXT UNIQUE NOT NULL,
    nome TEXT,
    numero TEXT,
    summary TEXT,
    conversazioni JSONB DEFAULT '[]'::jsonb,
    data_modifica TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base table
CREATE TABLE IF NOT EXISTS knowledge (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    prezzo TEXT,
    consegna TEXT,
    descrizione TEXT,
    domande JSONB DEFAULT '[]'::jsonb,
    categorie JSONB DEFAULT '[]'::jsonb,
    finiture JSONB DEFAULT '[]'::jsonb,
    domande_finali JSONB DEFAULT '[]'::jsonb
);
