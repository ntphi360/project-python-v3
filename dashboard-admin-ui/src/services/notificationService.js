import api from "./api";


export const getNotifications = async (
  receiverUserId,
  page = 1,
  pageSize = 20
) => {
  const response = await api.get("/notifications", {
    params: { receiverUserId, page, pageSize },
  });

  return response.data.data;
};

export const markNotificationRead = async (
  notificationId,
  receiverUserId
) => {
  const response = await api.patch(
    `/notifications/${notificationId}/read`,
    { receiverUserId }
  );

  return response.data.data;
};
