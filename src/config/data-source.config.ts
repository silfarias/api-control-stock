import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource, DataSourceOptions } from 'typeorm';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DataSourceConfig: DataSourceOptions = {
  // Hora local por defecto para proyectos de Argentina.
  // Si otro proyecto requiere otra zona, ajustar DB_TIMEZONE en .env (ej: '+00:00', '-03:00').
  // Nota: 'Z' = UTC.
  timezone: process.env.DB_TIMEZONE || '-03:00',
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT)!,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dbcontrolstock',
  entities: [
    join(__dirname, '..', 'modules', '**', 'entities', '*.entity{.ts,.js}'),
  ],
  logging: false,
  synchronize: true,
  extra: {
    timezone: process.env.DB_TIMEZONE || '-03:00',
    charset: 'utf8mb4',
    dateStrings: true,
  },
};

export const AppDataSource = new DataSource(DataSourceConfig);