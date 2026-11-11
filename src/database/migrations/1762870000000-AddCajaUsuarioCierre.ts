import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCajaUsuarioCierre1762870000000 implements MigrationInterface {
  name = 'AddCajaUsuarioCierre1762870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`caja\`
      ADD \`usuario_cierre_id\` int NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`caja\`
      ADD CONSTRAINT \`FK_caja_usuario_cierre\`
      FOREIGN KEY (\`usuario_cierre_id\`) REFERENCES \`usuario\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`caja\` DROP FOREIGN KEY \`FK_caja_usuario_cierre\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`caja\` DROP COLUMN \`usuario_cierre_id\`
    `);
  }
}
