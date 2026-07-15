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
import { FriendConnectionStatus } from "./friend-connection.types";

@Entity("friend_connections")
export class FriendConnectionEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid" })
  requesterId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "requesterId" })
  requester!: UserEntity;

  @Column({ type: "uuid" })
  addresseeId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "addresseeId" })
  addressee!: UserEntity;

  @Column({ type: "varchar" })
  status!: FriendConnectionStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
