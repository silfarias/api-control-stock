-- Formatea la base y deja el AUTO_INCREMENT de cada tabla en 1.
-- Ejecutar en DBeaver sobre la base del proyecto (la que ya tenés abierta).
-- Borra usuarios, productos, stock, ventas, compras, caja y proveedores.
--
-- Después de este script:
--   1. Con la API levantada y SEED_ADMIN_ENABLED=true: yarn seed:admin
--   2. Ejecutar scripts/sql/02-seed-motorepuestos.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE item_venta;
TRUNCATE TABLE item_compra;
TRUNCATE TABLE movimiento_caja;
TRUNCATE TABLE movimiento_stock;
TRUNCATE TABLE venta;
TRUNCATE TABLE compra;
TRUNCATE TABLE caja;
TRUNCATE TABLE stock;
TRUNCATE TABLE producto;
TRUNCATE TABLE categoria;
TRUNCATE TABLE proveedor;
TRUNCATE TABLE venta_numeracion;
TRUNCATE TABLE compra_numeracion;
TRUNCATE TABLE caja_numeracion;
TRUNCATE TABLE usuario;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO venta_numeracion (id, ultimo_numero) VALUES (1, 0);
INSERT INTO compra_numeracion (id, ultimo_numero) VALUES (1, 0);
INSERT INTO caja_numeracion (id, ultimo_numero) VALUES (1, 0);
