-- Carga 7 categorías y 30 repuestos de moto, con stock inicial 10 cada uno.
-- Ejecutar en DBeaver DESPUÉS de 01-reset-database.sql y de yarn seed:admin.
-- El movimiento de stock usa el primer usuario que exista (el admin recién creado).
-- Motivo alineado al alta de producto de la API: "Stock inicial al crear producto".

SET NAMES utf8mb4;
START TRANSACTION;

SET @usuario_id = (SELECT MIN(id) FROM usuario WHERE deleted_date IS NULL);

INSERT INTO categoria (id, nombre, descripcion, created_date, updated_date) VALUES
  (1, 'Motor', 'Pistones, juntas, encendido y carburación', NOW(), NOW()),
  (2, 'Frenos', 'Pastillas, discos, manijas y líquido', NOW(), NOW()),
  (3, 'Transmisión', 'Cadena, piñón, corona y embrague', NOW(), NOW()),
  (4, 'Filtros', 'Aire, aceite y combustible', NOW(), NOW()),
  (5, 'Eléctrico', 'Batería, luces y carga', NOW(), NOW()),
  (6, 'Suspensión', 'Amortiguadores, retenes y dirección', NOW(), NOW()),
  (7, 'Lubricantes', 'Aceites y grasas', NOW(), NOW());

INSERT INTO producto (
  nombre, descripcion, codigo, codigo_barras, categoria_id,
  precio_costo, precio_venta, minimo_stock, created_date, updated_date
) VALUES
  ('Pistón 150cc estándar', 'Pistón completo con perno para motores 150cc', 'MOT-001', '7790001500001', 1, 18500.00, 27900.00, 3, NOW(), NOW()),
  ('Kit de aros 150cc', 'Juego de aros de compresión y rasca aceite', 'MOT-002', '7790001500002', 1, 4200.00, 6900.00, 4, NOW(), NOW()),
  ('Junta de tapa de cilindro', 'Junta de tapa para cilindro 150cc', 'MOT-003', '7790001500003', 1, 1800.00, 3200.00, 4, NOW(), NOW()),
  ('Bujía NGK CR8E', 'Bujía de encendido para motos 125 a 250cc', 'MOT-004', '7790001500004', 1, 3500.00, 5900.00, 5, NOW(), NOW()),
  ('Carburador 150cc', 'Carburador a diafragma para motores 150cc', 'MOT-005', '7790001500005', 1, 24600.00, 38900.00, 2, NOW(), NOW()),
  ('Pastilla de freno delantera', 'Juego de pastillas delanteras de compuesto orgánico', 'FRE-001', '7790001500006', 2, 5400.00, 8900.00, 4, NOW(), NOW()),
  ('Pastilla de freno trasera', 'Juego de pastillas traseras', 'FRE-002', '7790001500007', 2, 4800.00, 7900.00, 4, NOW(), NOW()),
  ('Disco de freno 260 mm', 'Disco delantero ventilado 260 mm', 'FRE-003', '7790001500008', 2, 19800.00, 31500.00, 2, NOW(), NOW()),
  ('Manija de freno derecha', 'Manija de freno delantero con soporte', 'FRE-004', '7790001500009', 2, 3200.00, 5600.00, 3, NOW(), NOW()),
  ('Líquido de freno DOT 4 500 ml', 'Fluido de freno DOT 4', 'FRE-005', '7790001500010', 2, 2900.00, 4800.00, 5, NOW(), NOW()),
  ('Kit de arrastre 428 15/42', 'Cadena, piñón 15 y corona 42 paso 428', 'TRA-001', '7790001500011', 3, 27500.00, 42900.00, 2, NOW(), NOW()),
  ('Cadena 428H 120 eslabones', 'Cadena reforzada con unión a clip', 'TRA-002', '7790001500012', 3, 14200.00, 21900.00, 3, NOW(), NOW()),
  ('Piñón 15 dientes', 'Piñón de caja paso 428, 15 dientes', 'TRA-003', '7790001500013', 3, 3600.00, 6200.00, 4, NOW(), NOW()),
  ('Corona 42 dientes', 'Corona de acero paso 428, 42 dientes', 'TRA-004', '7790001500014', 3, 6800.00, 10900.00, 3, NOW(), NOW()),
  ('Cable de embrague', 'Cable de embrague con regulador', 'TRA-005', '7790001500015', 3, 2400.00, 4100.00, 4, NOW(), NOW()),
  ('Filtro de aceite universal', 'Filtro de aceite para motores horizontales', 'FIL-001', '7790001500016', 4, 2100.00, 3600.00, 6, NOW(), NOW()),
  ('Filtro de aire 150cc', 'Elemento de filtro de aire en espuma', 'FIL-002', '7790001500017', 4, 1800.00, 3200.00, 5, NOW(), NOW()),
  ('Filtro de nafta', 'Filtro de combustible en línea', 'FIL-003', '7790001500018', 4, 900.00, 1800.00, 8, NOW(), NOW()),
  ('Filtro de aire tipo Wave', 'Filtro de aire para cub y onda 110', 'FIL-004', '7790001500019', 4, 2200.00, 3900.00, 4, NOW(), NOW()),
  ('Batería 12V 4Ah', 'Batería sellada 12V 4Ah con borne positivo a la izquierda', 'ELE-001', '7790001500020', 5, 18900.00, 28900.00, 2, NOW(), NOW()),
  ('Regulador de voltaje', 'Regulador-rectificador 12V monofásico', 'ELE-002', '7790001500021', 5, 7600.00, 12400.00, 3, NOW(), NOW()),
  ('Bobina de encendido', 'Bobina de alta para CDI', 'ELE-003', '7790001500022', 5, 5400.00, 8900.00, 3, NOW(), NOW()),
  ('Lámpara delantera H4', 'Lámpara halógena H4 12V 35/35W', 'ELE-004', '7790001500023', 5, 1600.00, 2900.00, 6, NOW(), NOW()),
  ('Relay de arranque', 'Relay de burro de arranque 12V', 'ELE-005', '7790001500024', 5, 3100.00, 5400.00, 3, NOW(), NOW()),
  ('Amortiguador trasero', 'Amortiguador trasero regulable para 150cc', 'SUS-001', '7790001500025', 6, 22400.00, 34900.00, 2, NOW(), NOW()),
  ('Retén de barral 33 mm', 'Par de retenes de horquilla 33x46x11', 'SUS-002', '7790001500026', 6, 2800.00, 4900.00, 4, NOW(), NOW()),
  ('Rulemán de dirección', 'Juego de rulemanes cónicos de dirección', 'SUS-003', '7790001500027', 6, 4500.00, 7600.00, 3, NOW(), NOW()),
  ('Aceite 20W50 mineral 1 L', 'Aceite mineral para motor 4T', 'LUB-001', '7790001500028', 7, 4200.00, 6900.00, 6, NOW(), NOW()),
  ('Aceite 10W40 semisintético 1 L', 'Aceite semisintético para motor 4T', 'LUB-002', '7790001500029', 7, 6800.00, 10500.00, 5, NOW(), NOW()),
  ('Grasa de litio 250 g', 'Grasa para rodamientos y crucetas', 'LUB-003', '7790001500030', 7, 1900.00, 3400.00, 4, NOW(), NOW());

INSERT INTO stock (producto_id, cantidad, created_date, updated_date)
SELECT id, 10, NOW(), NOW()
FROM producto
WHERE deleted_date IS NULL;

INSERT INTO movimiento_stock (
  producto_id, tipo, cantidad, stock_anterior, stock_nuevo,
  tipo_referencia, motivo, usuario_id, created_date, updated_date
)
SELECT
  id,
  'AJUSTE_ENTRADA',
  10,
  0,
  10,
  'AJUSTE',
  'Stock inicial al crear producto',
  @usuario_id,
  NOW(),
  NOW()
FROM producto
WHERE deleted_date IS NULL;

COMMIT;
