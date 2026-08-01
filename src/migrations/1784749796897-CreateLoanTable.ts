import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLoanTable1784749796897 implements MigrationInterface {
    name = 'CreateLoanTable1784749796897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "loans" ("id" uuid NOT NULL, "bookId" uuid NOT NULL, "requesterId" uuid NOT NULL, "ownerId" uuid NOT NULL, "status" character varying NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_aad54a9134e293d4d3be70db995" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_e8ce609b40147d776d2cb1cfe92" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_de5f55e7ebc55185b9cfb1972f7" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE UNIQUE INDEX "loans_one_active_per_book" ON "loans" ("bookId") WHERE "status" = 'active'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "loans_one_active_per_book"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_de5f55e7ebc55185b9cfb1972f7"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_e8ce609b40147d776d2cb1cfe92"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_aad54a9134e293d4d3be70db995"`);
        await queryRunner.query(`DROP TABLE "loans"`);
    }

}
