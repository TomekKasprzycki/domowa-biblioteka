import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserEntity } from "@/server/user/user.entity";
import { BookEntity } from "@/server/book/book.entity";

const g = global as typeof global & {
  _typeormDataSource?: DataSource;
  _typeormDataSourcePromise?: Promise<DataSource>;
};

function createDataSource(): DataSource {
  return new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === "development",
    logging: process.env.NODE_ENV === "development",
    entities: [UserEntity, BookEntity],
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: true }
      : false,
  });
}

export async function getDataSource(): Promise<DataSource> {
  if (g._typeormDataSource?.isInitialized) {
    return g._typeormDataSource;
  }

  if (!g._typeormDataSourcePromise) {
    g._typeormDataSourcePromise = (async () => {
      const ds = createDataSource();
      try {
        await ds.initialize();
        g._typeormDataSource = ds;
        return ds;
      } catch (err) {
        g._typeormDataSourcePromise = undefined;
        throw err;
      }
    })();
  }

  return g._typeormDataSourcePromise;
}
