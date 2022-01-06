const dayjs = require("dayjs");
const { AppError, commonErrors } = require("../error");
const util = require("../misc/util");

class ItemModule {
  constructor(dbPool, logger) {
    this.dbPool = dbPool;
    this.logger = logger;
  }

  async createItem({
    ownerId,
    name,
    alias,
    description,
    purchasedAt, // unix time
    value,
    currencyCode,
    lifeSpan,
    tags,
  }) {
    const nowTimestamp = dayjs.utc().format("YYYY-MM-DD HH:mm:ss");
    const item = {
      ownerId,
      name,
      alias,
      description,
      addedAt: nowTimestamp,
      updatedAt: nowTimestamp,
      purchasedAt: dayjs.utc(purchasedAt).format("YYYY-MM-DD HH:mm:ss"),
      value,
      currentValue: value,
      currencyCode,
      lifeSpan,
      isFavorite: false,
      isArchived: false,
    };

    const result = {
      ...item,
      tags: [],
    };
    const client = this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const insertItemQuery = `INSERT INTO lot.items(owner_id, name, alias, description, added_at, updated_at, purchased_at, value, current_value, currency_code, life_span, is_favorite, is_archived) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;

      const { rows: itemRows } = await client.query(insertItemQuery, [
        item.ownerId,
        item.name,
        item.alias,
        item.description,
        item.addedAt,
        item.updatedAt,
        item.purchasedAt,
        item.value,
        item.currentValue,
        item.currencyCode,
        item.lifeSpan,
        item.isFavorite,
        item.isArchived,
      ]);

      const id = itemRows[0].id;
      result.id = id;

      const insertTagQuery = `INSERT INTO lot.tags(owner_id, name) VALUES ($1, $2) ON CONFLICT (owner_id, name) DO NOTHING RETURNING id`;

      const insertItemToTagQuery = `INSERT INTO lot.items_to_tags(owner_id, item_id, tag_id) VALUES ($1, $2, $3) ON CONFLICT (owner_id, item_id, tag_id) DO NOTHING`;

      for (const tag of tags) {
        let tagId = tag.id;
        if (tag.id === -1) {
          const { rows: tagRows } = await client.query(insertTagQuery, [
            ownerId,
            tag.name,
          ]);

          if (tagRows.length === 0) {
            throw new AppError(
              commonErrors.databaseError,
              `Could not create a new tag '${tag.name}'`
            );
          }

          tagId = tagRows[0].id;
        }
        await client.query(insertItemToTagQuery, [ownerId, id, tagId]);

        result.tags.push(tag);
      }
      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      this.logger.error(`IM::createItem: ${error.stack}`);

      throw new AppError(
        commonErrors.databaseError,
        `Could not create a new item`,
        true,
        500
      );
    } finally {
      client.release();
    }
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
    const wheres = [
      [`owner_id = $1`, ownerId],
      [`currency_code = $2`, currencyCode],
    ];
    if (!util.isNil(name)) {
      wheres.push([`name LIKE %$?%`, name]);
    }

    if (!util.isNil(alias)) {
      wheres.push([`alias LIKE %$?%`, alias]);
    }

    if (!util.isNil(purchasedTimeRange)) {
      const { min, max } = purchasedTimeRange;
      if (!util.isNil(min)) {
        wheres.push([`purchased_at >= ?`, min]);
      }

      if (!util.isNil(max)) {
        wheres.push([`purchased_at <= ?`, max]);
      }
    }

    if (!util.isNil(valueRange)) {
      const { min, max } = valueRange;
      if (!util.isNil(min)) {
        wheres.push([`value >= ?`, min]);
      }

      if (!util.isNil(max)) {
        wheres.push([`value <= ?`, max]);
      }
    }

    if (!util.isNil(currentValueRange)) {
      const { min, max } = currentValueRange;
      if (!util.isNil(min)) {
        wheres.push([`current_value >= ?`, min]);
      }

      if (!util.isNil(max)) {
        wheres.push([`current_value <= ?`, max]);
      }
    }

    if (!util.isNil(lifeSpanRange)) {
      const { min, max } = lifeSpanRange;
      if (!util.isNil(min)) {
        wheres.push([`life_span >= ?`, min]);
      }

      if (!util.isNil(max)) {
        wheres.push([`life_span <= ?`, max]);
      }
    }

    if (!util.isNil(isFavorite)) {
      wheres.push([`is_favorite = ?`, isFavorite]);
    }

    if (!util.isNil(isArchived)) {
      wheres.push([`is_archived = ?`, isArchived]);
    }

    const { clause, values } = wheres.reduce(
      (agg, [clause, value], index) => {
        if (index > 0) {
          agg.clause = `${agg.clause} AND ${clause.replace("?", index + 1)}`;
        } else {
          agg.clause = clause;
        }
        agg.values.push(value);
        return agg;
      },
      { clause: "", values: [] }
    );

    const query = `SELECT * FROM lot.items WHERE ${clause}`;

    const { rows } = await this.dbPool.query(query, values);

    const result =
      rows.length > 0
        ? rows.map((row) => ({
            id: row.id,
            name: row.name,
            alias: row.alias,
            description: row.description,
            addedAt: row.added_at,
            updatedAt: row.updated_at,
            purchasedAt: row.purchased_at,
            value: row.value,
            currentValue: row.current_value,
            currencyCode: row.currency_code,
            lifeSpan: row.life_span,
            isFavorite: row.is_favorite,
            isArchived: row.is_archived,
          }))
        : [];

    return result;
  }

  async getItem(id, ownerId) {
    const query = `SELECT * FROM lot.items WHERE id = $1 AND owner_id = $2`;

    const { rows } = await this.dbPool.query(query, [id, ownerId]);

    const result = rows.length > 0 ? rows[0] : null;

    return result;
  }

  async updateItem(
    id,
    ownerId,
    {
      name,
      alias,
      description,
      updatedAt,
      purchasedAt,
      value,
      currentValue,
      currencyCode,
      lifeSpan,
      isFavorite,
      isArchived,
      tags,
    }
  ) {
    const sets = [];

    if (!util.isNil(name)) {
      sets.push([`name = %$?%`, name]);
    }

    if (!util.isNil(alias)) {
      sets.push([`alias = %$?%`, alias]);
    }

    if (!util.isNil(description)) {
      sets.push([`description = %$?%`, description]);
    }

    if (!util.isNil(updatedAt)) {
      sets.push([
        `updated_at = %$?%`,
        dayjs.utc(updatedAt).format("YYYY-MM-DD HH:mm:ss"),
      ]);
    }

    if (!util.isNil(purchasedAt)) {
      sets.push([`purchased_at = %$?%`, purchasedAt]);
    }

    if (!util.isNil(value)) {
      sets.push([`value = %$?%`, value]);
    }

    if (!util.isNil(currentValue)) {
      sets.push([`current_value = %$?%`, currentValue]);
    }

    if (!util.isNil(currencyCode)) {
      sets.push([`currency_code = %$?%`, currencyCode]);
    }

    if (!util.isNil(lifeSpan)) {
      sets.push([`life_span = %$?%`, lifeSpan]);
    }

    if (!util.isNil(isFavorite)) {
      sets.push([`is_favorite = %$?%`, isFavorite]);
    }

    if (!util.isNil(isArchived)) {
      sets.push([`is_archived = %$?%`, isArchived]);
    }

    let parameterIndex = 0;
    const { clause, values } = sets.reduce(
      (agg, [clause, value], index) => {
        parameterIndex = index + 1;
        if (index > 0) {
          agg.clause = `${agg.clause}, ${clause.replace("?", parameterIndex)}`;
        } else {
          agg.clause = clause.replace("?", parameterIndex);
        }
        agg.values.push(value);
        return agg;
      },
      { clause: "", values: [] }
    );

    values.push(id);
    values.push(ownerId);

    const result = {};
    const client = this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const updateItemQuery = `UPDATE lot.items SET ${clause} WHERE id = $${++parameterIndex} AND owner_id = $${++parameterIndex} RETURNING *`;

      await client.query(updateItemQuery, values);

      if (!util.isNil(tags) && tags.length > 0) {
        const selectItemToTagQuery = `SELECT id FROM lot.items_to_tags WHERE owner_id = $1 AND id = $2`;

        const { rows: mappingRows } = await client.query(selectItemToTagQuery, [
          ownerId,
          id,
        ]);

        const dict = mappingRows.reduce((_dict, row) => {
          _dict[row.id] = true;
          return _dict;
        }, {});

        const insertTagQuery = `INSERT INTO lot.tags(owner_id, name) VALUES ($1, $2) ON CONFLICT (owner_id, name) DO NOTHING RETURNING id`;

        const insertItemToTagQuery = `INSERT INTO lot.items_to_tags(owner_id, item_id, tag_id) VALUES ($1, $2, $3) ON CONFLICT (owner_id, item_id, tag_id) DO NOTHING`;

        const deleteItemToTagQuery = `DELETE FROM lot.items_to_tag WHERE owner_id = $1 AND id = $2 AND tag_id = $3`;

        for (const tag of tags) {
          // Add a new tag
          if (tag.id === -1) {
            const { rows: tagRows } = await client.query(insertTagQuery, [
              ownerId,
              tag.name,
            ]);

            await client.query(insertItemToTagQuery, [
              ownerId,
              id,
              tagRows[0].id,
            ]);

            continue;
          }

          // Add a new mapping
          if (!dict[tag.id]) {
            await client.query(insertItemToTagQuery, [ownerId, id, tag.id]);
          } else {
            // remove unnecessary mapping
            await client.query(deleteItemToTagQuery, [ownerId, id, tag.id]);
            if (mappingRows.length === 0) {
              throw new AppError(
                commonErrors.resourceNotFoundError,
                `There is no mapping with id ${id}`,
                true,
                400
              );
            }
          }
        }
      }

      const selectUpdatedItemQuery = `
SELECT i.*, json_agg(to_jsonb(t.*) - 'owner_id') AS tags FROM lot.items i 
INNER JOIN lot.items_to_tags itt ON itt.owner_id = i.owner_id AND itt.item_id = i.id
INNER JOIN lot.tags t ON t.owner_id = itt.owner_id AND t.id = itt.tag_id
WHERE i.owner_id = $1 AND i.id = $2
GROUP BY i.id, i.owner_id, i.name, i.alias, i.description, i.added_at, i.updated_at, i.purchased_at, i.value, i.current_value, i.currency_code, i.life_span, i.is_favorite, i.is_archived`;

      const { rows: itemRows } = await client.query(selectUpdatedItemQuery, [
        ownerId,
        id,
      ]);

      if (itemRows.length > 0) {
        result.id = itemRows[0].id;
        result.name = itemRows[0].name;
        result.alias = itemRows[0].alias;
        result.description = itemRows[0].description;
        result.addedAt = dayjs.utc(itemRows[0].added_at).unix();
        result.updatedAt = dayjs.utc(itemRows[0].updated_at).unix();
        result.purchasedAt = dayjs.utc(itemRows[0].purchased_at).unix();
        result.value = itemRows[0].value;
        result.currentValue = itemRows[0].current_value;
        result.currencyCode = itemRows[0].currency_code;
        result.lifeSpan = itemRows[0].life_span;
        result.isFavorite = itemRows[0].is_favorite;
        result.isArchived = itemRows[0].is_archived;
        result.tags = itemRows[0].tags;
      }
      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      this.logger.error(`IM::updateItem: ${error.stack}`);

      throw new AppError(
        commonErrors.databaseError,
        `Could not update an item #'${id}'`,
        true,
        500
      );
    } finally {
      client.release();
    }
  }

  async deleteItem(id, ownerId) {
    const client = this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const deleteItemToTagQuery = `DELETE FROM lot.items_to_tags WHERE id = $1 AND owner_id = $2 RETURNING id`;

      const { rows: mappingRows } = await client.query(deleteItemToTagQuery, [
        id,
        ownerId,
      ]);
      if (mappingRows.length === 0) {
        throw new AppError(
          commonErrors.resourceNotFoundError,
          `There is no mapping with id ${id}`,
          true,
          400
        );
      }

      const deleteItemQuery = `DELETE FROM lot.items WHERE id = $1 AND owner_id = $2 RETURNING id`;

      const { rows: itemRows } = await client.query(deleteItemQuery, [
        id,
        ownerId,
      ]);
      if (itemRows.length === 0) {
        throw new AppError(
          commonErrors.resourceNotFoundError,
          `There is no item with id ${id}`,
          true,
          400
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");

      this.logger.error(`IM::deleteItem: ${error.stack}`);

      throw new AppError(
        commonErrors.databaseError,
        `Could not update an item #'${id}'`,
        true,
        500
      );
    } finally {
      client.release();
    }
  }
}

module.exports = ItemModule;
