import { PaginationCursor } from "./model";

export type ItemFilterOption = {
  cursor: PaginationCursor;
  name: string;
  alias: string;
  purchasedTimeRange: { min: number; max: number };
  valueRange: { min: number; max: number };
  lifeSpanRange: { min: number; max: number };
  currencyCode: string;
  isFavorite: boolean;
  isArchived: boolean;
};
