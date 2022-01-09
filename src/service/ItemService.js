class ItemService {
  constructor(itemModule, logger) {
    this.itemModule = itemModule;
    this.logger = logger;
  }

  async getItems(
    ownerId,
    {
      cursor,
      name,
      alias,
      purchasedTimeRange,
      valueRange,
      currencyCode,
      lifeSpanRange,
      isFavorite,
      isArchived,
    }
  ) {
    const result = await this.itemModule.getItems(ownerId, {
      cursor,
      name,
      alias,
      purchasedTimeRange,
      valueRange,
      currencyCode,
      lifeSpanRange,
      isFavorite,
      isArchived,
    });

    return result;
  }

  async getItem(ownerId, id) {
    const result = await this.itemModule.getItem(ownerId, id);

    return result;
  }
}

module.exports = ItemService;
