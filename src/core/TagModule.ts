import { FastifyLoggerInstance } from "fastify";
import { IDBPool } from "../data-access";
import { AppError, commonErrors } from "../error";
import { Tag } from "../model";

class TagModule {
  private readonly dbPool: IDBPool;
  private readonly logger: FastifyLoggerInstance;

  constructor(dbPool: IDBPool, logger: FastifyLoggerInstance) {
    this.dbPool = dbPool;
    this.logger = logger;
  }

  public async createTag(ownerId: string, name: string): Promise<Tag> {
    try {
      const existingTagRows = await this.dbPool.query(
        `SELECT * FROM lot.tags WHERE owner_id = $1 AND name = $2`,
        [ownerId, name]
      );

      if (existingTagRows.length > 0) {
        throw new AppError(
          commonErrors.resourceDuplicationError,
          `The tag named '${name}' already exists`,
          true,
          400
        );
      }

      const newTagRows = await this.dbPool.query(
        `INSERT INTO lot.tags(owner_id, name) VALUES ($1, $2) RETURNING *`,
        [ownerId, name]
      );

      const tag = {
        id: newTagRows[0].id,
        name: newTagRows[0].name,
      };

      return tag;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`TM::createTag: ${error.stack}`);
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not create a new tag`,
        true
      );
    }
  }

  public async getTags(ownerId: string, phrase?: string): Promise<Array<Tag>> {
    try {
      const tagRows = await this.dbPool.query(
        `SELECT * FROM lot.tags WHERE owner_id = $1 AND name LIKE %$2%`,
        [ownerId, phrase]
      );

      return tagRows.length > 0 ? <Array<Tag>>tagRows : [];
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`TM::getTags: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not get tags`,
        true
      );
    }
  }

  public async getTag(ownerId: string, id: number): Promise<Tag | null> {
    try {
      const tagRows = await this.dbPool.query(
        `SELECT * FROM lot.tags WHERE owner_id = $1 AND id = $2`,
        [ownerId, id]
      );

      return tagRows.length > 0 ? <Tag>tagRows[0] : null;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`TM::getTag: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not get a tag with id #${id}`,
        true
      );
    }
  }

  public async updateTag(
    ownerId: string,
    id: number,
    name: string
  ): Promise<Tag | null> {
    try {
      const tagRows = await this.dbPool.query(
        `UPDATE lot.tags SET name = $1 WHERE owner_id = $2 AND id = $3 RETURNING *`,
        [name, ownerId, id]
      );

      return tagRows.length > 0 ? <Tag>tagRows[0] : null;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`TM::updateTag: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not update a tag with id #${id}`,
        true
      );
    }
  }

  public async deleteTag(ownerId: string, id: number): Promise<number> {
    const client = await this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const tagRows = await this.dbPool.query(
        `DELETE FROM lot.tags WHERE owner_id = $1 AND id = $2 RETURNING id`,
        [ownerId, id]
      );

      if (tagRows.length === 0) {
        throw new AppError(
          commonErrors.resourceNotFoundError,
          `There is no item with id ${id}`,
          true,
          400
        );
      }

      const deleteItemToTagQuery = `DELETE FROM lot.items_to_tags WHERE owner_id = $1 AND tag_id = $2`;

      await client.query(deleteItemToTagQuery, [ownerId, id]);

      await client.query("COMMIT");

      return tagRows[0].id;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`TM::deleteTag: ${error.stack}`);
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not delete a tag with id #${id}`,
        true
      );
    }
  }
}

export default TagModule;
