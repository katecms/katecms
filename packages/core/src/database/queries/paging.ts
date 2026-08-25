/** Optional `LIMIT` / `OFFSET` for list queries. */
export interface ListPaging {
  limit?: number
  offset?: number
}

export function applyListPaging<T extends {
  limit: (value: number) => T
  offset: (value: number) => T
}>(query: T, paging?: ListPaging): T {
  let next = query
  if (paging?.limit != null) {
    next = next.limit(paging.limit)
  }
  if (paging?.offset != null) {
    next = next.offset(paging.offset)
  }
  return next
}
