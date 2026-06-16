import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config({ path: ".env.local" });

const cliDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL_UNPOOLED,
  synchronize: false,
  entities: ["src/server/**/*.entity.ts"],
  migrations: ["src/migrations/*.ts"],
  ssl: { rejectUnauthorized: true },
});

export default cliDataSource;
