import pg from "pg";
const { Pool } = pg;

const host = process.env.hostPostgresql;
const user = process.env.userPostgresql;
const password = process.env.passwordPostgresql;
const database = process.env.databasePostgresql;

export const pool = new Pool({
  host,
  user,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 60,
  port: 5432,
  password,
  database,
});
