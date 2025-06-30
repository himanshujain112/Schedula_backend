import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1751207407403 implements MigrationInterface {
    name = 'InitSchema1751207407403'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "booked_count" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "booked_count"`);
    }

}
