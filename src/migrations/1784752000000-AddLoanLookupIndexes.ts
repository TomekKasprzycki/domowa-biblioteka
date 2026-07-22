import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoanLookupIndexes1784752000000 implements MigrationInterface {
    name = 'AddLoanLookupIndexes1784752000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "loans_owner_status" ON "loans" ("ownerId", "status")`);
        await queryRunner.query(`CREATE INDEX "loans_requester" ON "loans" ("requesterId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "loans_requester"`);
        await queryRunner.query(`DROP INDEX "loans_owner_status"`);
    }

}
