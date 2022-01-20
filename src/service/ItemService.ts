import { FastifyLoggerInstance } from "fastify";
import { ItemModule } from "../core";
import { Item, Tag } from "../model";
import { ItemFilterOption } from "../types";

class ItemService {
  private readonly itemModule: ItemModule;
  private readonly logger: FastifyLoggerInstance;

  constructor(itemModule: ItemModule, logger: FastifyLoggerInstance) {
    this.itemModule = itemModule;
    this.logger = logger;
  }

  public async createItem(
    ownerId: string,
    name: string,
    alias: string,
    description: string,
    purchasedAt: number,
    value: number,
    currencyCode: string,
    lifeSpan: number,
    tags: Array<Tag>
  ) {
    const result = await this.itemModule.createItem(
      ownerId,
      name,
      alias,
      description,
      purchasedAt,
      value,
      currencyCode,
      lifeSpan,
      tags
    );

    return result;
  }

  public async getItems(ownerId: string, options: ItemFilterOption) {
    const paginatedItems = await this.itemModule.getItems(ownerId, options);

    return paginatedItems;
  }

  public async getItem(ownerId: string, id: number) {
    const item = await this.itemModule.getItem(ownerId, id);

    return item;
  }

  public async updateItem(
    ownerId: string,
    id: number,
    item: Omit<Item, "ownerId" | "id" | "added_at">
  ) {
    const updatedItem = await this.itemModule.updateItem(ownerId, id, item);

    return updatedItem;
  }

  public async deleteItem(ownerId: string, id: number) {
    const deletedItemId = await this.itemModule.deleteItem(ownerId, id);

    return deletedItemId;
  }
}

export default ItemService;
