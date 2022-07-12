interface PaginatedData<T> {
  total: number;
  cursor: number | string | null;
  data: Array<T>;
}

export default PaginatedData;
