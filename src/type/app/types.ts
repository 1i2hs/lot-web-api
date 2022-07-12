import { PaginationCursor } from ".";

export type ItemFilterOption = {
  cursor?: PaginationCursor;
  name?: string;
  alias?: string;
  purchasedTimeRange?: { min?: number; max?: number };
  valueRange?: { min?: number; max?: number };
  lifeSpanRange?: { min?: number; max?: number };
  currencyCode?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  currentValueRange?: { min?: number; max?: number };
  lifeSpanLeftRange?: { min?: number; max?: number };
};

export type ItemCursorBase =
  | "added_at"
  | "name"
  | "alias"
  | "purchased_at"
  | "value"
  | "life_span"
  | "current_value"
  | "life_span_left";

export type AuthToken = {
  uid: string;
};
