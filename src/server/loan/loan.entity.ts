import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserEntity } from "@/server/user/user.entity";
import { BookEntity } from "@/server/book/book.entity";
import { LoanStatus } from "./loan.types";

@Entity("loans")
export class LoanEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  bookId!: string;

  @ManyToOne(() => BookEntity)
  @JoinColumn({ name: "bookId" })
  book!: BookEntity;

  @Column({ type: "uuid" })
  requesterId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "requesterId" })
  requester!: UserEntity;

  @Column({ type: "uuid" })
  ownerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "ownerId" })
  owner!: UserEntity;

  @Column({ type: "varchar" })
  status!: LoanStatus;

  @Column({ type: "timestamptz", nullable: true })
  startedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
