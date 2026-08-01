import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameLoanOpenIndex1785615825849 implements MigrationInterface {
    name = 'RenameLoanOpenIndex1785615825849'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."loans_one_active_per_book"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "loans_one_open_per_book" ON "loans"  ("bookId") WHERE "status" IN ('active', 'return_pending')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."loans_one_open_per_book"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "loans_one_active_per_book" ON "loans" USING btree ("bookId") WHERE ((status)::text = 'active'::text)`);
    }

}
