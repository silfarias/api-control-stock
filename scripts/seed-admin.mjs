/**
 * Llama a POST /auth/seed-admin para crear el usuario ADMIN inicial.
 * Requiere API levantada y SEED_ADMIN_ENABLED=true en .env
 *
 * Uso: yarn seed:admin
 */
import 'dotenv/config';

const port = process.env.PORT || 3000;
// 127.0.0.1 evita fallos de IPv6 con "localhost" en Windows
const baseUrl = process.env.API_URL || `http://127.0.0.1:${port}`;
const url = `${baseUrl.replace(/\/$/, '')}/auth/seed-admin`;

async function main() {
  console.log(`→ POST ${url}`);

  const res = await fetch(url, { method: 'POST' });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`✗ Error ${res.status}:`, body);
    process.exit(1);
  }

  console.log(body.created ? '✓ Admin creado' : '✓ Admin ya existía');
  console.log(`  nombre: ${body.usuario?.nombre}`);
  console.log(`  email:  ${body.usuario?.email}`);
  console.log(`  role:   ${body.usuario?.role}`);
  console.log(`  message: ${body.message}`);
}

main().catch((err) => {
  console.error('✗ No se pudo contactar la API. ¿Está corriendo yarn start:dev?', err.message);
  process.exit(1);
});
