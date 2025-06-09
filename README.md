# CRM Modul Group

## Setup

1. **Node.js 20** or later is required. You can check your version with `node -v`.
2. Install dependencies:

   ```bash
   npm install
   ```
3. Create an environment with the following variables:

   - `DATABASE_URL` – PostgreSQL connection string.
   - `JWT_SECRET` – secret used to sign authentication tokens.
   - `ADMIN_PASSWORD` – password for the admin login page.
   - `CHATBOT_API_KEY` – API key for chatbot endpoints.
   - Optional: `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD`, `PGPORT` for the backup script.
   - Optional: `PORT` to change the server port (defaults to `3000`).

These variables can be placed in a `.env` file or exported in your shell.

## Running the server

Start the application with:

```bash
npm start
```

The server will listen on `http://localhost:3000` by default.

## Backup script

A manual backup of the `clients` and `knowledge` tables can be created with:

```bash
node backup.js
```

JSON backup files are stored inside the `backups/` directory (ignored by Git). The script keeps only the five most recent backups.

## Web interface

After starting the server visit `http://localhost:3000/login.html` and log in with the admin password. Once authenticated you can access the following pages:

- `index.html` – dashboard for managing clients.
- `knowledge.html` – CRUD interface for the knowledge base.

## API overview

All API routes are prefixed with `/api`. Authentication is required for all routes except `/api/login`, `/api/logout` and those under `/api/chatbot/*` which instead require a valid `x-api-key` header equal to `CHATBOT_API_KEY`.

### Authentication

- `POST /api/login` – body `{ "password": "ADMIN_PASSWORD" }`. Sets a cookie named `crmToken`.
- `POST /api/logout` – clears the authentication cookie.

### Chatbot endpoints

- `GET /api/chatbot/client/:id_voiceflow` – fetch client details by Voiceflow id.
- `POST /api/chatbot/client` – create or update a client.
- `POST /api/chatbot/client/conversation` – append a conversation.
- `GET /api/chatbot/knowledge/search?tipo=...` – search knowledge entries by type.

### Client management

- `GET /api/clients` – list all clients.
- `GET /api/clients/:id` – fetch a single client.
- `POST /api/clients` – create a client `{ id_voiceflow }`.
- `PUT /api/clients/:id` – update fields such as `nome`, `numero`, `summary`, `conversazioni`.
- `DELETE /api/clients/:id` – remove a client.

### Knowledge base

- `GET /api/knowledge` – list knowledge records.
- `POST /api/knowledge` – create a record.
- `PUT /api/knowledge/:id` – update a record.
- `DELETE /api/knowledge/:id` – delete a record.

Each endpoint returns JSON data. See the source code for detailed field formats.

