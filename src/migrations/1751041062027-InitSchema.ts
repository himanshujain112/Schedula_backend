import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1751041062027 implements MigrationInterface {
    name = 'InitSchema1751041062027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."doctor_schedule_type_enum" AS ENUM('stream', 'wave')`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "schedule_type" "public"."doctor_schedule_type_enum" NOT NULL DEFAULT 'stream'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "schedule_type"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_schedule_type_enum"`);
    }

}
