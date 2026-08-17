import api from "./api";

export const getCases = async (
  page = 1,
  perPage = 10
) => {
  const response = await api.get("/cases", {
    params: {
      page,
      per_page: perPage,
    },
  });

  return response.data.data;
};