import { Tag } from ".";

interface Item {
  id: number;
  ownerId: string;
  name: string;
  alias?: string;
  description?: string;
  addedAt?: number | string;
  updatedAt?: number | string;
  purchasedAt: number | string;
  value: number;
  currencyCode: string;
  lifeSpan: number;
  isFavorite: boolean;
  isArchived: boolean;
  tags: Array<Tag>;

  // optional calculated properties
  currentValue?: number;
  lifeSpanLeft?: number;
  lifePercentage?: number;
}

export default Item;
