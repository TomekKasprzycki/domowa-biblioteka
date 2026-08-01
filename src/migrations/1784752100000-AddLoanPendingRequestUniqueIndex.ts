import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoanPendingRequestUniqueIndex1784752100000 implements MigrationInterface {
    name = 'AddLoanPendingRequestUniqueIndex1784752100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "loans_one_pending_per_book_requester" ON "loans" ("bookId", "requesterId") WHERE "status" = 'requested'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "loans_one_pending_per_book_requester"`);
    }

}
