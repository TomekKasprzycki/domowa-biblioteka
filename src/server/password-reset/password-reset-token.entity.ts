import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { UserEntity } from "@/server/user/user.entity";

@Entity("password_reset_tokens")
@Index("password_reset_tokens_token_hash", ["tokenHash"], { unique: true })
@Index("password_reset_tokens_user_id", ["userId"])
export class PasswordResetTokenEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ type: "varchar" })
  tokenHash!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
