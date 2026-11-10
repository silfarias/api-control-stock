# Despliegue en VPS (Hostinger) — preparación

**Esta etapa solo documenta y deja archivos de ejemplo. No despliega nada.**

Documentos relacionados: [mysql-seguridad.md](mysql-seguridad.md) · [backups.md](backups.md) · [migraciones.md](migraciones.md)

---

## 1. Arquitectura recomendada

```
Internet
   │
   ▼
Nginx (443 TLS) ─── estáticos React (Vite dist)
   │
   └── proxy ──► NestJS en 127.0.0.1:3000 (systemd)
                      │
                      ▼
                 MySQL 127.0.0.1:3306
                 (puerto no público)
```

| Pieza | Elección | Motivo |
|-------|----------|--------|
| Frontend | Build estático Vite | Sin Node en runtime para el front |
| API | Un proceso NestJS (`node dist/main`) | Suficiente para un comercio |
| Proceso | **systemd** | Nativo, reinicio, journalctl, sin PM2 extra |
| Proxy/TLS | Nginx + Let’s Encrypt | Estándar en VPS Hostinger |
| MySQL | Mismo VPS, solo localhost | Simple; usuarios mínimos (etapa 3.2) |
| Contenedores | **No** para toda la app en prod | Docker queda para MySQL local en desarrollo; en VPS una instalación tradicional reduce piezas que operar |

No se usan Kubernetes, Redis ni balanceadores en esta fase.

---

## 2. NestJS en producción

| Tema | Valor |
|------|--------|
| Node | **≥ 22** (`.nvmrc`, `engines`) |
| Módulo | ESM (`"type": "module"`) |
| Build | `yarn build` → `dist/` |
| Run | `yarn start:prod` ≡ `node dist/main` |
| `NODE_ENV` | `production` |
| Escucha | `HOST=127.0.0.1` + `PORT=3000` (solo Nginx habla con la API) |
| Proxy | `TRUST_PROXY=true` (1 hop Nginx) |
| CORS | `CORS_ORIGINS=https://tu-dominio` |
| Swagger | OFF (`SWAGGER_ENABLED` omitido o `false`) |
| Helmet / throttle | Ya activos |
| Health | `GET /health` |
| Apagado | `enableShutdownHooks()` + SIGTERM (systemd) |

Migraciones: `DB_SYNCHRONIZE=false`; correr con usuario `migrate_stock` (no `app_stock`).

---

## 3. Archivos de ejemplo

| Archivo | Uso |
|---------|-----|
| [`deploy/nginx/control-stock.conf.example`](../deploy/nginx/control-stock.conf.example) | Sitio Nginx + HTTPS + SPA + proxy |
| [`deploy/systemd/api-control-stock.service.example`](../deploy/systemd/api-control-stock.service.example) | Unidad systemd |
| [`deploy/env.production.example`](../deploy/env.production.example) | Plantilla de `/etc/control-stock/api.env` |

Sustituir `api.ejemplo.com` y rutas `/var/www/control-stock/...` por los valores reales del VPS.

---

## 4. Checklist de seguridad del VPS

- [ ] SSH solo con clave; usuario con sudo (no operar siempre como root)
- [ ] Tras verificar login por clave: deshabilitar `PasswordAuthentication`
- [ ] Firewall (UFW/csf): abrir **22** (o puerto SSH custom), **80**, **443**; **cerrar 3000 y 3306** al exterior
- [ ] HTTPS obligatorio (redirigir HTTP→HTTPS)
- [ ] Actualizaciones (`unattended-upgrades` o rutina manual)
- [ ] MySQL solo en `127.0.0.1`; usuarios `app_stock` / `migrate_stock` / `backup_stock`
- [ ] Secrets en `/etc/control-stock/api.env` (`chmod 600`, owner del servicio)
- [ ] Backups diarios + copia **fuera** del VPS
- [ ] Rotación de logs (journald + nginx)
- [ ] Plan de rollback (backup previo + reinstalar `dist` anterior)

**No aplicar firewall/SSH en esta etapa.**

---

## 5. Procedimiento de despliegue (cuando exista el VPS)

1. **Preparar VPS** — Ubuntu LTS, usuario sudo, SSH por clave.
2. **Dependencias** — Node 22, Yarn 4 (Corepack), Nginx, MySQL, Certbot.
3. **MySQL** — Base `DB_NAME`; bind `127.0.0.1`; sin puerto público.
4. **Usuarios MySQL** — Aplicar plantilla `scripts/sql/03-mysql-users.sql` (con autorización).
5. **Variables** — Copiar `deploy/env.production.example` → `/etc/control-stock/api.env` y completar secretos.
6. **Código API** — Clonar/copiar en `/var/www/control-stock/api`, `yarn install --immutable`, `yarn build`.
7. **Migraciones** — Backup → `DB_USERNAME=migrate_stock … yarn migration:run`.
8. **systemd** — Instalar unit de ejemplo, `enable --now`, comprobar `journalctl -u api-control-stock`.
9. **Nginx** — Site de ejemplo; `nginx -t` && reload.
10. **HTTPS** — `certbot --nginx -d tu-dominio`.
11. **Frontend** — `vite build` → `/var/www/control-stock/frontend/dist` (URL API = dominio HTTPS).
12. **Verificar** — `/health`, login, refresh, operación de lectura.
13. **Backups** — Cron `yarn backup:mysql` + `BACKUP_EXTERNAL_DIR`.
14. **Restore de prueba** — Base temporal (`docs/backups.md`).
15. **Smoke general** — Auth, venta/caja según checklist funcional del negocio.

### Actualización de versión

1. `yarn backup:mysql` y verificar `.sql.gz`.
2. Parar servicio o desplegar en carpeta nueva (blue/green simple: `api-prev` / `api`).
3. `git pull` (o subir artefacto) → `yarn install --immutable` → `yarn build`.
4. Migraciones pendientes (si hay) con `migrate_stock`.
5. `systemctl restart api-control-stock`.
6. Publicar nuevo `frontend/dist` si cambió.
7. Verificar `/health` y login.

### Recuperación ante fallo

1. Revisar `journalctl -u api-control-stock -e` y logs Nginx.
2. Restaurar binarios/`dist` de la versión anterior y reiniciar.
3. Si una migración dejó la DB inconsistente: **no** confiar solo en `migration:revert`; restaurar backup en temporal, validar y planificar cutover (ver backups.md).

---

## 6. Decisiones pendientes (servidor definitivo)

- Dominio único vs `app.` + `api.`
- ¿MySQL del panel Hostinger o instalado en el VPS?
- Ruta exacta de Node (`/usr/bin/node` vs nvm)
- Destino offsite de backups (S3 compatible, otro VPS, PC)
- Horario del cron y retención final
- Si el front comparte dominio y hay colisión de rutas SPA ↔ API

---

## 7. Qué no hacer todavía

- No desplegar en Hostinger
- No instalar Nginx/Certbot/systemd en la PC de desarrollo
- No crear usuarios MySQL ni abrir firewall sin autorización
- No pedir certificados Let’s Encrypt reales en esta etapa
