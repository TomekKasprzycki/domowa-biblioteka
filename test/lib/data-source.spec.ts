import { DataSource } from "typeorm";
import { getDataSource } from "@/lib/data-source";

describe("getDataSource", () => {
  let dataSource: DataSource;

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("initializes the data source", async () => {
    dataSource = await getDataSource();
    expect(dataSource.isInitialized).toBe(true);
  });

  it("can execute a query", async () => {
    const result = await dataSource.query("SELECT 1");
    expect(result).toBeTruthy();
  });
});
