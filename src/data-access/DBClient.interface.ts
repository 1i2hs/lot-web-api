interface DBClient {
  query(...args: Array<any>): Promise<Array<Record<string, any>>>;
  release(): void;
}

export default DBClient;
