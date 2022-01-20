import { FastifyLoggerInstance } from "fastify";
import dayjs from "dayjs";
import "dayjs/plugin/utc.js";
import { IDBPool } from "../data-access";
import { Item, PaginationCursor, Tag } from "../model";
import { AppError, commonErrors } from "../error";
import * as util from "../misc/util";
import { ItemFilterOption } from "../types";
import PaginatedData from "../model/PaginatedData";

class ItemModule {
  private readonly dbPool: IDBPool;
  private readonly logger: FastifyLoggerInstance;
  private readonly cursorToWhereMap: Record<
    string,
    {
      DESC(value: number | string): [string, number | string];
      ASC(value: number | string): [string, number | string];
    }
  > = {
    added_at: {
      DESC: (value: number): [string, string] => [
        `added_at < $?`,
        dayjs.utc(value).format("YYYY-MM-DD HH:mm:ssZZ"),
      ],
      ASC: (value: number) => [
        `added_at > $?`,
        dayjs.utc(value).format("YYYY-MM-DD HH:mm:ssZZ"),
      ],
    },
    name: {
      DESC: (value: string) => [`name < $?`, value],
      ASC: (value: string) => [`name > $?`, value],
    },
    alias: {
      DESC: (value: string) => [`alias < $?`, value],
      ASC: (value: string) => [`alias > $?`, value],
    },
    purchased_at: {
      DESC: (value: number) => [
        `purchased_at < $?`,
        dayjs.utc(value).format("YYYY-MM-DD HH:mm:ssZZ"),
      ],
      ASC: (value: number) => [
        `purchased_at > $?`,
        dayjs.utc(value).format("YYYY-MM-DD HH:mm:ssZZ"),
      ],
    },
    value: {
      DESC: (value: number) => [`value < $?`, value],
      ASC: (value: number) => [`value > $?`, value],
    },
    life_span: {
      DESC: (value: number) => [`life_span < $?`, value],
      ASC: (value: number) => [`life_span > $?`, value],
    },
    current_value: {
      DESC: (value: number) => [`current_value < $?`, value],
      ASC: (value: number) => [`current_value > $?`, value],
    },
    life_span_left: {
      DESC: (value: number) => [`life_span_left < $?`, value],
      ASC: (value: number) => [`life_span_left > $?`, value],
    },
  };

  constructor(dbPool: IDBPool, logger: FastifyLoggerInstance) {
    this.dbPool = dbPool;
    this.logger = logger;
  }

  public async createItem(
    ownerId: string,
    name: string,
    alias: string,
    description: string,
    purchasedAt: number, // unix time
    value: number,
    currencyCode: string,
    lifeSpan: number, // unix time (seconds)
    tags: Array<Tag>
  ): Promise<Item> {
    const nowTimestamp = dayjs.utc().format("YYYY-MM-DD HH:mm:ssZZ");
    const item = {
      ownerId,
      name,
      alias,
      description,
      addedAt: nowTimestamp,
      updatedAt: nowTimestamp,
      purchasedAt: dayjs.unix(purchasedAt).format("YYYY-MM-DD HH:mm:ssZZ"),
      value,
      currencyCode,
      lifeSpan,
      isFavorite: false,
      isArchived: false,
    };

    const client = await this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const insertItemQuery = `INSERT INTO lot.items(owner_id, name, alias, description, added_at, updated_at, purchased_at, value, currency_code, life_span, is_favorite, is_archived) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;

      const itemRows = await client.query(insertItemQuery, [
        item.ownerId,
        item.name,
        item.alias,
        item.description,
        item.addedAt,
        item.updatedAt,
        item.purchasedAt,
        item.value,
        item.currencyCode,
        item.lifeSpan,
        item.isFavorite,
        item.isArchived,
      ]);

      const id = itemRows[0].id;

      const result: Item = {
        ownerId,
        id,
        name: itemRows[0].name,
        alias: itemRows[0].alias,
        description: itemRows[0].description,
        addedAt: dayjs.utc(itemRows[0].added_at).unix(),
        updatedAt: dayjs.utc(itemRows[0].updated_at).unix(),
        purchasedAt: dayjs.utc(itemRows[0].purchased_at).unix(),
        value: itemRows[0].value,
        currencyCode: itemRows[0].currency_code,
        lifeSpan: itemRows[0].life_span,
        isFavorite: itemRows[0].is_favorite,
        isArchived: itemRows[0].is_archived,
        tags: [],
      };

      const insertTagQuery = `INSERT INTO lot.tags(owner_id, name) VALUES ($1, $2) RETURNING id`;

      const insertItemToTagQuery = `INSERT INTO lot.items_to_tags(owner_id, item_id, tag_id) VALUES ($1, $2, $3)`;

      for (const tag of tags) {
        if (tag.id === -1) {
          const tagRows = await client.query(insertTagQuery, [
            ownerId,
            tag.name,
          ]);

          if (tagRows.length === 0) {
            throw new AppError(
              commonErrors.databaseError,
              `Could not create a new tag '${tag.name}'`,
              true
            );
          }

          tag.id = tagRows[0].id;
        }
        await client.query(insertItemToTagQuery, [ownerId, id, tag.id]);

        result.tags.push(tag);
      }
      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      if (error instanceof Error) {
        this.logger.error(`IM::createItem: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not create a new item`,
        true
      );
    } finally {
      client.release();
    }
  }

  public async getItems(
    ownerId: string,
    options: ItemFilterOption
  ): Promise<PaginatedData<Item>> {
    const {
      cursor,
      name,
      alias,
      purchasedTimeRange,
      valueRange,
      lifeSpanRange,
      currencyCode,
      isFavorite,
      isArchived,
      currentValueRange,
      lifeSpanLeftRange,
    } = options;

    const order = {
      base: cursor?.base ?? "added_at",
      direction: cursor?.order ?? "DESC",
    };

    const _cursor = cursor?.value;

    const nestedQueryRequired =
      order.base === "current_value" || order.base === "life_span_left";

    const wheres: Array<[string, number | string | boolean]> = [
      [`owner_id = $?`, ownerId],
    ];

    const cursorWhereFn =
      this.cursorToWhereMap[order.base]?.[<"ASC" | "DESC">order.direction];
    if (cursorWhereFn === undefined) {
      throw new AppError(
        commonErrors.fatalError,
        `Incompatible field ${order.base} is given to query results`,
        true
      );
    }

    if (!util.isNil(_cursor)) {
      if (!nestedQueryRequired) {
        const where = cursorWhereFn(_cursor!);
        wheres.push(where);
      }
    }

    if (!util.isNil(name)) {
      wheres.push([`name LIKE %$?%`, name!]);
    }

    if (!util.isNil(alias)) {
      wheres.push([`alias LIKE %$?%`, alias!]);
    }

    if (!util.isNil(purchasedTimeRange)) {
      const { min, max } = purchasedTimeRange!;
      if (!util.isNil(min)) {
        wheres.push([
          `purchased_at >= $?`,
          dayjs.utc(min).format("YYYY-MM-DD HH:mm:ssZZ"),
        ]);
      }

      if (!util.isNil(max)) {
        wheres.push([
          `purchased_at <= $?`,
          dayjs.utc(max).format("YYYY-MM-DD HH:mm:ssZZ"),
        ]);
      }
    }

    if (!util.isNil(valueRange)) {
      const { min, max } = valueRange!;
      if (!util.isNil(min)) {
        wheres.push([`value >= $?`, min!]);
      }

      if (!util.isNil(max)) {
        wheres.push([`value <= $?`, max!]);
      }
    }

    if (!util.isNil(lifeSpanRange)) {
      const { min, max } = lifeSpanRange!;
      if (!util.isNil(min)) {
        wheres.push([`life_span >= $?`, min!]);
      }

      if (!util.isNil(max)) {
        wheres.push([`life_span <= $?`, max!]);
      }
    }

    if (!util.isNil(currencyCode)) {
      wheres.push([`currency_code = $?`, currencyCode!]);
    }

    if (!util.isNil(isFavorite)) {
      wheres.push([`is_favorite = $?`, isFavorite!]);
    }

    if (!util.isNil(isArchived)) {
      wheres.push([`is_archived = $?`, isArchived!]);
    }

    if (!util.isNil(currentValueRange)) {
      const { min, max } = currentValueRange!;
      if (!util.isNil(min)) {
        wheres.push([`current_value >= $?`, min!]);
      }

      if (!util.isNil(max)) {
        wheres.push([`current_value <= $?`, max!]);
      }
    }

    if (!util.isNil(lifeSpanLeftRange)) {
      const { min, max } = lifeSpanLeftRange!;
      if (!util.isNil(min)) {
        wheres.push([`life_span_left >= $?`, min!]);
      }

      if (!util.isNil(max)) {
        wheres.push([`life_span_left <= $?`, max!]);
      }
    }

    let parameterIndex = 0;
    const { clause, values } = wheres.reduce(
      (agg, [clause, value], index) => {
        parameterIndex = index + 1;
        if (index > 0) {
          agg.clause = `${agg.clause} AND i.${clause.replace(
            "?",
            String(parameterIndex)
          )}`;
        } else {
          agg.clause = `i.${clause.replace("?", String(parameterIndex))}`;
        }
        agg.values.push(value);
        return agg;
      },
      { clause: "", values: <Array<number | string | boolean>>[] }
    );

    if (nestedQueryRequired) {
      values.push(_cursor!);
    }

    try {
      /**
       * candidates of ORDER BY:
       * - added_at(default, which works like the id)
       * - name(alphabetical order)
       * - purchased_at
       * - value
       * - current value(need calculation)
       * - life_span
       * - life_span_left(need calculation)
       */
      const query = !nestedQueryRequired
        ? `
SELECT
    i.*,
    ROUND(i.value * EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span)              AS current_value, -- value * (today - purchased_at) / life_span
    i.life_span - EXTRACT(EPOCH FROM (now() - i.purchased_at))                               AS life_span_left, -- life_span - (today - purchased_at)
    ROUND((EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span * 100)::numeric, 2)    AS life_percentage, -- (today - purchased_at) / life_span * 100
    json_agg(to_jsonb(t.*) - 'owner_id') AS tags
FROM lot.items i
LEFT OUTER JOIN lot.items_to_tags itt ON itt.owner_id = i.owner_id AND itt.item_id = i.id
LEFT OUTER JOIN lot.tags t ON t.owner_id = itt.owner_id AND t.id = itt.tag_id
WHERE ${clause}
GROUP BY i.id, i.owner_id, i.name, i.alias, i.description, i.added_at, i.updated_at, i.purchased_at, i.value, i.currency_code, i.life_span, i.is_favorite, i.is_archived
ORDER BY i.${order.base} ${order.direction}
LIMIT 100`
        : `
SELECT * FROM (
    SELECT
        i.*,
        ROUND(i.value * EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span)              AS current_value, -- value * (today - purchased_at) / life_span
        i.life_span - EXTRACT(EPOCH FROM (now() - i.purchased_at))                               AS life_span_left, -- life_span - (today - purchased_at)
        ROUND((EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span * 100)::numeric, 2)    AS life_percentage, -- (today - purchased_at) / life_span * 100
        json_agg(to_jsonb(t.*) - 'owner_id') AS tags
    FROM lot.items i
    LEFT OUTER JOIN lot.items_to_tags itt ON itt.owner_id = i.owner_id AND itt.item_id = i.id
    LEFT OUTER JOIN lot.tags t ON t.owner_id = itt.owner_id AND t.id = itt.tag_id
    WHERE ${clause}
    GROUP BY i.id, i.owner_id, i.name, i.alias, i.description, i.added_at, i.updated_at, i.purchased_at, i.value, i.currency_code, i.life_span, i.is_favorite, i.is_archived
) 
WHERE ${order.base} ${
            order.direction === "ASC" ? ">" : "<"
          } $${++parameterIndex}
LIMIT 100`;

      const rows = await this.dbPool.query(query, values);

      const [{ total }] = await this.dbPool.query(
        "SELECT COUNT(*) AS total FROM lot.items WHERE owner_id = $1",
        [ownerId]
      );

      const result =
        rows.length > 0
          ? {
              total,
              cursor: rows[rows.length - 1][order.base],
              data: rows.map((row) => ({
                ownerId: row.owner_id,
                id: row.id,
                name: row.name,
                alias: row.alias,
                description: row.description,
                addedAt: dayjs.utc(row.added_at).unix(),
                updatedAt: dayjs.utc(row.updated_at).unix(),
                purchasedAt: dayjs.utc(row.purchased_at).unix(),
                value: row.value,
                currencyCode: row.currency_code,
                lifeSpan: row.life_span,
                isFavorite: row.is_favorite,
                isArchived: row.is_archived,
                tags: <Array<Tag>>(row.tags[0] === null ? [] : row.tags),
                currentValue: row.current_value,
                lifeSpanLeft: row.life_span_left,
                lifePercentage: row.life_percentage,
              })),
            }
          : {
              total,
              cursor: null,
              data: [],
            };

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`IM::getItems: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not get items`,
        true
      );
    }
  }

  public async getItem(ownerId: string, id: number): Promise<Item | null> {
    try {
      const query = `
SELECT
    i.*,
    ROUND(i.value * EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span)              AS current_value, -- value * (today - purchased_at) / life_span
    i.life_span - EXTRACT(EPOCH FROM (now() - i.purchased_at))                               AS life_span_left, -- life_span - (today - purchased_at)
    ROUND((EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span * 100)::numeric, 2)    AS life_percentage, -- (today - purchased_at) / life_span * 100
    json_agg(to_jsonb(t.*) - 'owner_id') AS tags
FROM lot.items i
LEFT OUTER JOIN lot.items_to_tags itt ON itt.owner_id = i.owner_id AND itt.item_id = i.id
LEFT OUTER JOIN lot.tags t ON t.owner_id = itt.owner_id AND t.id = itt.tag_id
WHERE i.owner_id = $1 AND i.id = $2
GROUP BY i.id, i.owner_id, i.name, i.alias, i.description, i.added_at, i.updated_at, i.purchased_at, i.value, i.currency_code, i.life_span, i.is_favorite, i.is_archived`;

      const rows = await this.dbPool.query(query, [ownerId, id]);

      const result =
        rows.length > 0
          ? {
              ownerId: rows[0].owner_id,
              id: rows[0].id,
              name: rows[0].name,
              alias: rows[0].alias,
              description: rows[0].description,
              addedAt: dayjs.utc(rows[0].added_at).unix(),
              updatedAt: dayjs.utc(rows[0].updated_at).unix(),
              purchasedAt: dayjs.utc(rows[0].purchased_at).unix(),
              value: rows[0].value,
              currencyCode: rows[0].currency_code,
              lifeSpan: rows[0].life_span,
              isFavorite: rows[0].is_favorite,
              isArchived: rows[0].is_archived,
              tags: <Array<Tag>>(rows[0].tags[0] === null ? [] : rows[0].tags),
              currentValue: rows[0].current_value,
              lifeSpanLeft: rows[0].life_span_left,
              lifePercentage: rows[0].life_percentage,
            }
          : null;

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`IM::getItem: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not get an item #${id}`,
        true
      );
    }
  }

  public async updateItem(
    ownerId: string,
    id: number,
    item: Omit<Item, "ownerId" | "id" | "added_at">
  ): Promise<Item> {
    const {
      name,
      alias,
      description,
      updatedAt,
      purchasedAt,
      value,
      currencyCode,
      lifeSpan,
      isFavorite,
      isArchived,
      tags,
    } = item;

    const sets: Array<[string, string | number | boolean]> = [];

    if (!util.isNil(name)) {
      sets.push([`name = $?`, name]);
    }

    if (!util.isNil(alias)) {
      sets.push([`alias = $?`, alias!]);
    }

    if (!util.isNil(description)) {
      sets.push([`description = $?`, description!]);
    }

    if (!util.isNil(updatedAt)) {
      sets.push([
        `updated_at = $?`,
        dayjs.utc(updatedAt).format("YYYY-MM-DD HH:mm:ssZZ"),
      ]);
    }

    if (!util.isNil(purchasedAt)) {
      sets.push([`purchased_at = $?`, purchasedAt]);
    }

    if (!util.isNil(value)) {
      sets.push([`value = $?`, value]);
    }

    if (!util.isNil(currencyCode)) {
      sets.push([`currency_code = $?`, currencyCode]);
    }

    if (!util.isNil(lifeSpan)) {
      sets.push([`life_span = $?`, lifeSpan]);
    }

    if (!util.isNil(isFavorite)) {
      sets.push([`is_favorite = $?`, isFavorite]);
    }

    if (!util.isNil(isArchived)) {
      sets.push([`is_archived = $?`, isArchived]);
    }

    sets.push([`updated_at = $?`, dayjs.utc().format("YYYY-MM-DD HH:mm:ssZZ")]);

    let parameterIndex = 0;
    const { clause, values } = sets.reduce(
      (agg, [clause, value], index) => {
        parameterIndex = index + 1;
        if (index > 0) {
          agg.clause = `${agg.clause}, ${clause.replace(
            "?",
            String(parameterIndex)
          )}`;
        } else {
          agg.clause = clause.replace("?", String(parameterIndex));
        }
        agg.values.push(value);
        return agg;
      },
      { clause: "", values: <Array<number | string | boolean>>[] }
    );

    values.push(id);
    values.push(ownerId);

    const client = await this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const updateItemQuery = `UPDATE lot.items SET ${clause} WHERE id = $${++parameterIndex} AND owner_id = $${++parameterIndex} RETURNING *`;

      await client.query(updateItemQuery, values);

      if (!util.isNil(tags) && tags.length > 0) {
        const selectItemToTagQuery = `SELECT id FROM lot.items_to_tags WHERE owner_id = $1 AND id = $2`;

        const mappingRows = await client.query(selectItemToTagQuery, [
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
            const tagRows = await client.query(insertTagQuery, [
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
SELECT
    i.*,
    ROUND(i.value * EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span)              AS current_value, -- value * (today - purchased_at) / life_span
    ROUND((EXTRACT(EPOCH FROM (now() - i.purchased_at)) / i.life_span * 100)::numeric, 2)    AS life_percentage, -- (today - purchased_at) / life_span * 100
    json_agg(to_jsonb(t.*) - 'owner_id') AS tags
FROM lot.items i
LEFT OUTER JOIN lot.items_to_tags itt ON itt.owner_id = i.owner_id AND itt.item_id = i.id
LEFT OUTER JOIN lot.tags t ON t.owner_id = itt.owner_id AND t.id = itt.tag_id
WHERE i.owner_id = $1 AND i.id = $2
GROUP BY i.id, i.owner_id, i.name, i.alias, i.description, i.added_at, i.updated_at, i.purchased_at, i.value, i.currency_code, i.life_span, i.is_favorite, i.is_archived`;

      const itemRows = await client.query(selectUpdatedItemQuery, [
        ownerId,
        id,
      ]);

      await client.query("COMMIT");

      const result = {
        ownerId: itemRows[0].owner_id,
        id: itemRows[0].id,
        name: itemRows[0].name,
        alias: itemRows[0].alias,
        description: itemRows[0].description,
        addedAt: dayjs.utc(itemRows[0].added_at).unix(),
        updatedAt: dayjs.utc(itemRows[0].updated_at).unix(),
        purchasedAt: dayjs.utc(itemRows[0].purchased_at).unix(),
        value: itemRows[0].value,
        currencyCode: itemRows[0].currency_code,
        lifeSpan: itemRows[0].life_span,
        isFavorite: itemRows[0].is_favorite,
        isArchived: itemRows[0].is_archived,
        tags: <Array<Tag>>(
          (itemRows[0].tags[0] === null ? [] : itemRows[0].tags)
        ),
        currentValue: itemRows[0].current_value,
        lifeSpanLeft: itemRows[0].life_span_left,
        lifePercentage: itemRows[0].life_percentage,
      };

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      if (error instanceof Error) {
        this.logger.error(`IM::updateItem: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not update an item #'${id}'`,
        true
      );
    } finally {
      client.release();
    }
  }

  public async deleteItem(ownerId: string, id: number): Promise<number> {
    const client = await this.dbPool.getClient();
    try {
      await client.query("BEGIN");

      const deleteItemToTagQuery = `DELETE FROM lot.items_to_tags WHERE owner_id = $1 AND item_id = $2`;

      const mappingRows = await client.query(deleteItemToTagQuery, [
        ownerId,
        id,
      ]);

      const deleteItemQuery = `DELETE FROM lot.items WHERE owner_id = $1 AND id = $2 RETURNING id`;

      const itemRows = await client.query(deleteItemQuery, [ownerId, id]);
      if (itemRows.length === 0) {
        throw new AppError(
          commonErrors.resourceNotFoundError,
          `There is no item with id ${id}`,
          true,
          400
        );
      }
      await client.query("COMMIT");

      return id;
    } catch (error) {
      await client.query("ROLLBACK");

      if (error instanceof Error) {
        this.logger.error(`IM::deleteItem: ${error.stack}`);
      }

      throw new AppError(
        commonErrors.databaseError,
        `Could not delete an item #'${id}'`,
        true
      );
    } finally {
      client.release();
    }
  }
}

export default ItemModule;
