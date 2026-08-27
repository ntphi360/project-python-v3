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

export const getCaseById = async (id) => {
  const response = await api.get(`/cases/${id}`);

  return response.data.data;
};

export const getCaseHistory = async (id) => {
  const response = await api.get(`/cases/${id}/history`);

  return response.data.data;
};

export const createCase = async (data) => {
  const response = await api.post("/cases", data);

  return response.data.data;
};

export const updateCase = async (id, data) => {
  const response = await api.put(`/cases/${id}`, data);

  return response.data.data;
};

export const deleteCase = async (id) => {
  const response = await api.delete(`/cases/${id}`);

  return response.data;
};
