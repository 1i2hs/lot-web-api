import DBClient from "./DBClient.interface";

interface DBPool {
  query(...args: any[]): Promise<Array<Record<string, any>>>;
  isConnected(): Promise<boolean>;
  getClient(): Promise<DBClient>;
  disconnect(): Promise<void>;
}

export default DBPool;
