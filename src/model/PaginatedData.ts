import { PaginationCursor } from ".";

interface PaginatedData<T> {
  total: number;
  cursor: PaginationCursor;
  data: Array<T>;
}

export default PaginatedData;
