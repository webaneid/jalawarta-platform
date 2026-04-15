import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/jalawarta";

// Nonaktifkan prepare agar tidak lock issue dalam development serverless Next.js
const client = postgres(connectionString, { prepare: false });

export const db = drizzle({ client, schema });
