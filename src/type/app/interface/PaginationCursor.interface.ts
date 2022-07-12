import { ItemCursorBase } from "../types";

interface PaginationCursor {
  base: ItemCursorBase;
  order: string;
  value: string | number;
}

export default PaginationCursor;
