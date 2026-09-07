import api from "./api";


export const getNotifications = async (
  page = 1,
  pageSize = 20
) => {
  const response = await api.get("/notifications", {
    params: { page, pageSize },
  });

  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);

  return response.data.data;
};
