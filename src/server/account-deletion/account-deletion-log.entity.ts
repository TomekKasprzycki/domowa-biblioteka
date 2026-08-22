import "reflect-metadata";
import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity("account_deletion_log")
export class AccountDeletionLogEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "varchar" })
  deletedUserIdHash!: string;

  @CreateDateColumn()
  deletedAt!: Date;
}
