import "reflect-metadata";
import { DataSource } from "typeorm";

const g = global as typeof global & { _typeormDataSource?: DataSource };

function createDataSource(): DataSource {
  return new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === "development",
    logging: process.env.NODE_ENV === "development",
    entities: [],
    migrations: ["src/migrations/*.ts"],
  });
}

export async function getDataSource(): Promise<DataSource> {
  if (!g._typeormDataSource) {
    g._typeormDataSource = createDataSource();
  }

  if (!g._typeormDataSource.isInitialized) {
    await g._typeormDataSource.initialize();
  }

  return g._typeormDataSource;
}
