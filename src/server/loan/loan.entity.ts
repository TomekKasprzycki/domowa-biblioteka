import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { UserEntity } from "@/server/user/user.entity";
import { BookEntity } from "@/server/book/book.entity";
import { LoanStatus } from "./loan.types";

@Entity("loans")
// Declared here (not just in the migration) so that `synchronize: true`
// in development recognizes this partial index as part of the intended
// schema instead of dropping it as unrecognized — it does not compare a
// `where`-less index the same way, which is why this one alone was lost.
@Index("loans_one_active_per_book", ["bookId"], {
  unique: true,
  where: "\"status\" = 'active'",
})
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
