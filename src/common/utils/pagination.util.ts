export function getPagination(params: { page: number; limit: number }) {
  const page = Math.max(params.page, 1);
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}

export function getPaginationMeta(params: {
  page: number;
  limit: number;
  total: number;
}) {
  return {
    page: params.page,
    limit: params.limit,
    total: params.total,
    totalPages: Math.ceil(params.total / params.limit),
  };
}

