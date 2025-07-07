import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1751864528834 implements MigrationInterface {
    name = 'InitSchema1751864528834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" ADD "booking_start_time" TIME`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "booking_end_time" TIME`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "booking_start_time"`);
    }

}
