import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794325489312 implements MigrationInterface {
    name = 'InitialSchema1794325489312'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`caja_numeracion\` (\`id\` int NOT NULL, \`ultimo_numero\` int UNSIGNED NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`usuario\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`nombre\` varchar(120) NOT NULL, \`email\` varchar(180) NOT NULL, \`password\` varchar(255) NOT NULL, \`role\` enum ('ADMIN', 'EMPLEADO') NOT NULL DEFAULT 'EMPLEADO', UNIQUE INDEX \`IDX_2863682842e688ca198eb25c12\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`auth_session\` (\`id\` varchar(36) NOT NULL, \`usuario_id\` int NOT NULL, \`refresh_token_hash\` varchar(64) NOT NULL, \`expires_at\` datetime NOT NULL, \`revoked_at\` datetime NULL, \`user_agent\` varchar(255) NULL, \`ip\` varchar(64) NULL, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_auth_session_usuario\` (\`usuario_id\`), UNIQUE INDEX \`uq_auth_session_refresh_hash\` (\`refresh_token_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`caja\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`numero\` int UNSIGNED NULL, \`monto_apertura\` decimal(14,2) NOT NULL, \`monto_cierre\` decimal(14,2) NULL, \`monto_esperado\` decimal(14,2) NULL, \`abierta_en\` datetime NOT NULL, \`cerrada_en\` datetime NULL, \`estado\` enum ('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA', \`usuario_id\` int NOT NULL, UNIQUE INDEX \`IDX_31c5a67828cf611003ba3b5503\` (\`numero\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`movimiento_caja\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`tipo\` enum ('VENTA', 'INGRESO', 'EGRESO') NOT NULL, \`monto\` decimal(14,2) NOT NULL, \`descripcion\` varchar(500) NULL, \`referencia_id\` int NULL, \`caja_id\` int NOT NULL, \`usuario_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`categoria\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`nombre\` varchar(120) NOT NULL, \`descripcion\` varchar(500) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`compra_numeracion\` (\`id\` int NOT NULL, \`ultimo_numero\` int UNSIGNED NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`proveedor\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`nombre\` varchar(180) NOT NULL, \`cuit\` varchar(30) NULL, \`telefono\` varchar(40) NULL, \`email\` varchar(180) NULL, \`direccion\` varchar(255) NULL, \`activo\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`compra\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`numero\` int UNSIGNED NULL, \`total\` decimal(14,2) NOT NULL DEFAULT '0.00', \`estado\` enum ('BORRADOR', 'CONFIRMADA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR', \`proveedor_id\` int NOT NULL, \`usuario_id\` int NOT NULL, UNIQUE INDEX \`IDX_f18adb99732217833f33d6ee6f\` (\`numero\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`producto\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`nombre\` varchar(120) NOT NULL, \`descripcion\` varchar(500) NULL, \`codigo\` varchar(80) NOT NULL, \`codigo_barras\` varchar(80) NOT NULL, \`precio_costo\` decimal(12,2) NOT NULL DEFAULT '0.00', \`precio_venta\` decimal(12,2) NOT NULL DEFAULT '0.00', \`minimo_stock\` int NOT NULL DEFAULT '0', \`categoria_id\` int NOT NULL, UNIQUE INDEX \`IDX_4ecaa777d3efc10b5a6327cfe4\` (\`codigo\`), UNIQUE INDEX \`IDX_bd23c8bcd2ec20dbeff299d241\` (\`codigo_barras\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`item_compra\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`cantidad\` int NOT NULL, \`costo_unitario\` decimal(12,2) NOT NULL, \`subtotal\` decimal(14,2) NOT NULL, \`compra_id\` int NOT NULL, \`producto_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`movimiento_stock\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`tipo\` enum ('COMPRA', 'VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA') NOT NULL, \`cantidad\` int NOT NULL, \`stock_anterior\` int NOT NULL, \`stock_nuevo\` int NOT NULL, \`tipo_referencia\` enum ('AJUSTE', 'COMPRA', 'VENTA', 'OTRO') NOT NULL, \`referencia_id\` int NULL, \`motivo\` varchar(500) NOT NULL, \`descripcion\` varchar(500) NULL, \`producto_id\` int NOT NULL, \`usuario_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`stock\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`cantidad\` int NOT NULL DEFAULT '0', \`producto_id\` int NOT NULL, UNIQUE INDEX \`REL_dafa790e6b13a93401ca6042f0\` (\`producto_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ticket\` (\`id\` int NOT NULL AUTO_INCREMENT, \`unica\` tinyint NOT NULL DEFAULT '1', \`paper_mm\` int NOT NULL DEFAULT '80', \`comercio\` varchar(120) NOT NULL DEFAULT '', \`direccion\` varchar(200) NOT NULL DEFAULT '', \`telefono\` varchar(40) NOT NULL DEFAULT '', \`cuit\` varchar(20) NOT NULL DEFAULT '', \`mensaje\` varchar(200) NOT NULL DEFAULT 'Gracias por su compra', \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_cbde3381b92b8d4fee55f8e2e7\` (\`unica\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`venta\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`numero\` int UNSIGNED NULL, \`total\` decimal(14,2) NOT NULL DEFAULT '0.00', \`metodo_pago\` enum ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'OTRO') NOT NULL, \`estado\` enum ('CONFIRMADA', 'CANCELADA') NOT NULL DEFAULT 'CONFIRMADA', \`usuario_id\` int NOT NULL, UNIQUE INDEX \`IDX_c8c2d80d004896517196dc6fef\` (\`numero\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`item_venta\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_date\` datetime(6) NULL, \`cantidad\` int NOT NULL, \`precio_unitario\` decimal(12,2) NOT NULL, \`subtotal\` decimal(14,2) NOT NULL, \`venta_id\` int NOT NULL, \`producto_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`venta_numeracion\` (\`id\` int NOT NULL, \`ultimo_numero\` int UNSIGNED NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`auth_session\` ADD CONSTRAINT \`FK_22dc06814cc461c58c8759ef728\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`caja\` ADD CONSTRAINT \`FK_a4921713d0609afe1d5bc4d071a\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movimiento_caja\` ADD CONSTRAINT \`FK_f823715e8a343bb71bd4d5a7745\` FOREIGN KEY (\`caja_id\`) REFERENCES \`caja\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movimiento_caja\` ADD CONSTRAINT \`FK_33b031680979a63dad22118e756\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`compra\` ADD CONSTRAINT \`FK_8171d7051b32f75fcc5c909eb50\` FOREIGN KEY (\`proveedor_id\`) REFERENCES \`proveedor\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`compra\` ADD CONSTRAINT \`FK_aca90c481b29b1c8a4bda31f3db\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`producto\` ADD CONSTRAINT \`FK_1ae19a0cb542cf735d454bab0b5\` FOREIGN KEY (\`categoria_id\`) REFERENCES \`categoria\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`item_compra\` ADD CONSTRAINT \`FK_1c24966dd80f41a783d403b42f0\` FOREIGN KEY (\`compra_id\`) REFERENCES \`compra\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`item_compra\` ADD CONSTRAINT \`FK_e4034e35af096f9a26d481c3c5f\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movimiento_stock\` ADD CONSTRAINT \`FK_710f568fa31814d122557802f62\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movimiento_stock\` ADD CONSTRAINT \`FK_7bcb47a863c1926656d60d2e0a4\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stock\` ADD CONSTRAINT \`FK_dafa790e6b13a93401ca6042f01\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`venta\` ADD CONSTRAINT \`FK_89bc3aa08059be02886d102c019\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`item_venta\` ADD CONSTRAINT \`FK_aecca060b08da5e916825a1cd20\` FOREIGN KEY (\`venta_id\`) REFERENCES \`venta\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`item_venta\` ADD CONSTRAINT \`FK_a3d33ea0509cb8ff435f2fed469\` FOREIGN KEY (\`producto_id\`) REFERENCES \`producto\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`item_venta\` DROP FOREIGN KEY \`FK_a3d33ea0509cb8ff435f2fed469\``);
        await queryRunner.query(`ALTER TABLE \`item_venta\` DROP FOREIGN KEY \`FK_aecca060b08da5e916825a1cd20\``);
        await queryRunner.query(`ALTER TABLE \`venta\` DROP FOREIGN KEY \`FK_89bc3aa08059be02886d102c019\``);
        await queryRunner.query(`ALTER TABLE \`stock\` DROP FOREIGN KEY \`FK_dafa790e6b13a93401ca6042f01\``);
        await queryRunner.query(`ALTER TABLE \`movimiento_stock\` DROP FOREIGN KEY \`FK_7bcb47a863c1926656d60d2e0a4\``);
        await queryRunner.query(`ALTER TABLE \`movimiento_stock\` DROP FOREIGN KEY \`FK_710f568fa31814d122557802f62\``);
        await queryRunner.query(`ALTER TABLE \`item_compra\` DROP FOREIGN KEY \`FK_e4034e35af096f9a26d481c3c5f\``);
        await queryRunner.query(`ALTER TABLE \`item_compra\` DROP FOREIGN KEY \`FK_1c24966dd80f41a783d403b42f0\``);
        await queryRunner.query(`ALTER TABLE \`producto\` DROP FOREIGN KEY \`FK_1ae19a0cb542cf735d454bab0b5\``);
        await queryRunner.query(`ALTER TABLE \`compra\` DROP FOREIGN KEY \`FK_aca90c481b29b1c8a4bda31f3db\``);
        await queryRunner.query(`ALTER TABLE \`compra\` DROP FOREIGN KEY \`FK_8171d7051b32f75fcc5c909eb50\``);
        await queryRunner.query(`ALTER TABLE \`movimiento_caja\` DROP FOREIGN KEY \`FK_33b031680979a63dad22118e756\``);
        await queryRunner.query(`ALTER TABLE \`movimiento_caja\` DROP FOREIGN KEY \`FK_f823715e8a343bb71bd4d5a7745\``);
        await queryRunner.query(`ALTER TABLE \`caja\` DROP FOREIGN KEY \`FK_a4921713d0609afe1d5bc4d071a\``);
        await queryRunner.query(`ALTER TABLE \`auth_session\` DROP FOREIGN KEY \`FK_22dc06814cc461c58c8759ef728\``);
        await queryRunner.query(`DROP TABLE \`venta_numeracion\``);
        await queryRunner.query(`DROP TABLE \`item_venta\``);
        await queryRunner.query(`DROP INDEX \`IDX_c8c2d80d004896517196dc6fef\` ON \`venta\``);
        await queryRunner.query(`DROP TABLE \`venta\``);
        await queryRunner.query(`DROP INDEX \`IDX_cbde3381b92b8d4fee55f8e2e7\` ON \`ticket\``);
        await queryRunner.query(`DROP TABLE \`ticket\``);
        await queryRunner.query(`DROP INDEX \`REL_dafa790e6b13a93401ca6042f0\` ON \`stock\``);
        await queryRunner.query(`DROP TABLE \`stock\``);
        await queryRunner.query(`DROP TABLE \`movimiento_stock\``);
        await queryRunner.query(`DROP TABLE \`item_compra\``);
        await queryRunner.query(`DROP INDEX \`IDX_bd23c8bcd2ec20dbeff299d241\` ON \`producto\``);
        await queryRunner.query(`DROP INDEX \`IDX_4ecaa777d3efc10b5a6327cfe4\` ON \`producto\``);
        await queryRunner.query(`DROP TABLE \`producto\``);
        await queryRunner.query(`DROP INDEX \`IDX_f18adb99732217833f33d6ee6f\` ON \`compra\``);
        await queryRunner.query(`DROP TABLE \`compra\``);
        await queryRunner.query(`DROP TABLE \`proveedor\``);
        await queryRunner.query(`DROP TABLE \`compra_numeracion\``);
        await queryRunner.query(`DROP TABLE \`categoria\``);
        await queryRunner.query(`DROP TABLE \`movimiento_caja\``);
        await queryRunner.query(`DROP INDEX \`IDX_31c5a67828cf611003ba3b5503\` ON \`caja\``);
        await queryRunner.query(`DROP TABLE \`caja\``);
        await queryRunner.query(`DROP INDEX \`uq_auth_session_refresh_hash\` ON \`auth_session\``);
        await queryRunner.query(`DROP INDEX \`idx_auth_session_usuario\` ON \`auth_session\``);
        await queryRunner.query(`DROP TABLE \`auth_session\``);
        await queryRunner.query(`DROP INDEX \`IDX_2863682842e688ca198eb25c12\` ON \`usuario\``);
        await queryRunner.query(`DROP TABLE \`usuario\``);
        await queryRunner.query(`DROP TABLE \`caja_numeracion\``);
    }

}
