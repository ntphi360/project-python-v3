import api from "./api";

export const getCases = async (
  page = 1,
  perPage = 10,
  filters = {}
) => {
  const response = await api.get("/cases", {
    params: {
      page,
      per_page: perPage,

      search: filters.search || undefined,
      status: filters.status || undefined,
      department: filters.department || undefined,
      assignee: filters.assignee || undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
    },
  });

  return response.data.data;
};