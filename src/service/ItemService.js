class ItemService {
  constructor(itemModule, logger) {
    this.itemModule = itemModule;
    this.logger = logger;
  }

  async getItems(
    ownerId,
    currencyCode,
    {
      name,
      alias,
      purchasedTimeRange,
      valueRange,
      currentValueRange,
      lifeSpanRange,
      isFavorite,
      isArchived,
    }
  ) {
    try {
      const result = await this.itemModule.getItems(ownerId, currencyCode, {
        name,
        alias,
        purchasedTimeRange,
        valueRange,
        currentValueRange,
        lifeSpanRange,
        isFavorite,
        isArchived,
      });

      return result;
    } catch (error) {
      this.logger.error(`IS::getItems: ${error.stack}`);
      return null;
    }
  }
}

module.exports = ItemService;
