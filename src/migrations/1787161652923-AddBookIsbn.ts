import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBookIsbn1787161652923 implements MigrationInterface {
    name = 'AddBookIsbn1787161652923'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "books" ADD "isbn" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "books" DROP COLUMN "isbn"`);
    }

}
