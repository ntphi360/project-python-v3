import api from "./api";

export const getProcedures = async () => {
  const response = await api.get("/procedures");

  return response.data.data;
};

export const getDepartments = async () => {
  const response = await api.get("/departments");

  return response.data.data;
};

export const getAgencies = async () => {
  const response = await api.get("/agencies");

  return response.data.data;
};

export const getUsers = async (departmentId) => {
  const response = await api.get("/users", {
    params: {
      department_id: departmentId,
    },
  });

  return response.data.data;
};
