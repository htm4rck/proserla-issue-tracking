/** Loaded before e2e specs so AppModule can skip a real Postgres connection. */
process.env.SKIP_DATABASE = 'true';
