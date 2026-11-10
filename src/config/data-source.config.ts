import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource, DataSourceOptions } from 'typeorm';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';
/** Solo desarrollo/local y si se pide explícitamente. Nunca en production. */
const synchronizeRequested =
  !isProduction && process.env.DB_SYNCHRONIZE === 'true';

/**
 * Opciones compartidas por Nest (`TypeOrmModule.forRoot`) y por el CLI de TypeORM.
 * El esquema se gestiona con migraciones (`yarn migration:run`), no con schema:sync.
 */
export const DataSourceConfig: DataSourceOptions = {
  // Hora local por defecto para proyectos de Argentina.
  // Si otro proyecto requiere otra zona, ajustar DB_TIMEZONE en .env (ej: '+00:00', '-03:00').
  // Nota: 'Z' = UTC.
  timezone: process.env.DB_TIMEZONE || '-03:00',
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dbcontrolstock',
  entities: [
    join(__dirname, '..', 'modules', '**', 'entities', '*.entity{.ts,.js}'),
  ],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: synchronizeRequested,
  migrationsRun: false,
  extra: {
    timezone: process.env.DB_TIMEZONE || '-03:00',
    charset: 'utf8mb4',
    dateStrings: true,
  },
};

/** DataSource para el CLI (`migration:*`). Nest no usa esta instancia. */
export const AppDataSource = new DataSource(DataSourceConfig);
