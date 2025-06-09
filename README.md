*/
# CRM Module

This project exposes a simple CRM backend built with Express.

## Environment variables

- `CORS_ORIGINS` - comma separated list of allowed origins for CORS. If not set, `*` is used.
- `NODE_ENV` - when set to `production`, cookies are marked as secure.

Run the application with `npm start` after creating a `.env` file with the needed settings.
=======
# Crm_Modul_Group

This project runs an Express server using a PostgreSQL database.  
Below are the basic steps required to create the database schema and start the server.

## Database setup

1. Install PostgreSQL and create a database (for example `crm`).

   ```bash
   createdb crm
   ```

2. Apply the database schema contained in `schema.sql`:

   ```bash
   psql -d crm -f schema.sql
   ```

   The schema creates the `clients` and `knowledge` tables used by the application.

3. Configure your database credentials using `DATABASE_URL` or the standard `PG*` environment variables.

## Running migrations

Whenever the schema changes, re-run the script:

```bash
psql -d crm -f schema.sql
```

## Starting the server

Install dependencies and start the application:

```bash
npm install
npm start
```
*/