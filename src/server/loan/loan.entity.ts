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
import { LoanStatus } from "@/server/loan/loan.types";

@Entity("loans")
// Every index below must be declared here, not only in its migration.
// TypeORM's schema synchronizer drops any index it finds in the database
// whose NAME is absent from entity metadata (RdbmsSchemaBuilder
// .shouldDropIndices), so with `synchronize: true` in development a
// migration-only index is silently deleted on the next dev-server request.
// That is exactly what happened to loans_one_active_per_book during S-04.
// Note the `where` predicate is never compared by the synchronizer — only
// the name, columns, uniqueness and type — so a divergence between these
// declarations and the migrations will NOT be caught automatically.
@Index("loans_one_active_per_book", ["bookId"], {
  unique: true,
  where: "\"status\" = 'active'",
})
// Postgres does not auto-index foreign-key columns. These back the owner
// inbox + nav badge (ownerId, status) and the borrower's /borrowing list
// (requesterId), which would otherwise sequential-scan loans on every
// authenticated page render.
@Index("loans_owner_status", ["ownerId", "status"])
@Index("loans_requester", ["requesterId"])
// One pending request per (book, requester). The dedup pre-check in
// requestBorrowAction is a read-then-write, so this index is what actually
// closes the window when the same borrower double-submits. Declined rows are
// excluded from the predicate, so re-requesting after a decline still works.
@Index("loans_one_pending_per_book_requester", ["bookId", "requesterId"], {
  unique: true,
  where: "\"status\" = 'requested'",
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
