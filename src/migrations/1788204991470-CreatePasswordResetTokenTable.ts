import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePasswordResetTokenTable1788204991470 implements MigrationInterface {
    name = 'CreatePasswordResetTokenTable1788204991470'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL, "userId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "password_reset_tokens_user_id" ON "password_reset_tokens"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "password_reset_tokens_token_hash" ON "password_reset_tokens"  ("tokenHash") `);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_d6a19d4b4f6c62dcd29daa497e2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_d6a19d4b4f6c62dcd29daa497e2"`);
        await queryRunner.query(`DROP INDEX "public"."password_reset_tokens_token_hash"`);
        await queryRunner.query(`DROP INDEX "public"."password_reset_tokens_user_id"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    }

}
