import "reflect-metadata";
import { DataSource } from "typeorm";

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
    entities: ["src/server/**/*.entity.ts"],
    ssl: { rejectUnauthorized: true },
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
