import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFriendConnectionTable1784146760613 implements MigrationInterface {
    name = 'CreateFriendConnectionTable1784146760613'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "friend_connections" ("id" uuid NOT NULL, "requesterId" uuid NOT NULL, "addresseeId" uuid NOT NULL, "status" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_54fce9463ed390560d472d632b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "friend_connections" ADD CONSTRAINT "FK_5a77b59bf511bd24c9a644bb7b2" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_connections" ADD CONSTRAINT "FK_10117b99f16e9839c6b02493e2e" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_friend_connections_pair" ON "friend_connections" (LEAST("requesterId", "addresseeId"), GREATEST("requesterId", "addresseeId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "UQ_friend_connections_pair"`);
        await queryRunner.query(`ALTER TABLE "friend_connections" DROP CONSTRAINT "FK_10117b99f16e9839c6b02493e2e"`);
        await queryRunner.query(`ALTER TABLE "friend_connections" DROP CONSTRAINT "FK_5a77b59bf511bd24c9a644bb7b2"`);
        await queryRunner.query(`DROP TABLE "friend_connections"`);
    }

}
