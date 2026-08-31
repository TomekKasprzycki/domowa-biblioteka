import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAccountDeletionLogTable1787433997458 implements MigrationInterface {
    name = 'CreateAccountDeletionLogTable1787433997458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "account_deletion_log" ("id" uuid NOT NULL, "deletedUserIdHash" character varying NOT NULL, "deletedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_12848e32a0a75261675aa4498fd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "account_deletion_log"`);
    }

}
