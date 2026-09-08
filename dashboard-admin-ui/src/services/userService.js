import api from "./api";


export async function getUsers(page = 1, pageSize = 10, filters = {}) {
  const response = await api.get("/users", {
    params: {
      page,
      pageSize,
      keyword: filters.keyword || undefined,
      role: filters.role || undefined,
      departmentId: filters.departmentId || undefined,
      isActive: filters.isActive === "" ? undefined : filters.isActive,
    },
  });
  return response.data.data;
}

export async function createUser(payload) {
  const response = await api.post("/users", payload);
  return response.data.data;
}

export async function updateUser(userId, payload) {
  const response = await api.patch(`/users/${userId}`, payload);
  return response.data.data;
}

export async function changeUserRole(userId, role) {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return response.data.data;
}

export async function changeUserStatus(userId, isActive) {
  const response = await api.patch(`/users/${userId}/status`, { isActive });
  return response.data.data;
}

export async function resetUserPassword(userId, passwords) {
  const response = await api.post(
    `/users/${userId}/reset-password`,
    passwords,
  );
  return response.data;
}
