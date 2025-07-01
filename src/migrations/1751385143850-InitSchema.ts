import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1751385143850 implements MigrationInterface {
    name = 'InitSchema1751385143850'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" ADD "reporting_time" TIME`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "slot_duration" integer NOT NULL DEFAULT '30'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "patients_per_slot" integer NOT NULL DEFAULT '3'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "slot_duration"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "reporting_time"`);
    }

}
