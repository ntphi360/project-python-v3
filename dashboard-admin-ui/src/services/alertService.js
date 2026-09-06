import api from "./api";


export const getAlerts = async (
  page = 1,
  pageSize = 10,
  filters = {}
) => {
  const response = await api.get("/alerts", {
    params: {
      page,
      pageSize,
      keyword: filters.keyword || undefined,
      alertType: filters.alertType || undefined,
      department: filters.department || undefined,
      assignee: filters.assignee || undefined,
    },
  });

  return response.data.data;
};

export const sendCaseReminder = async (caseId, message, channels) => {
  const response = await api.post(`/alerts/${caseId}/remind`, {
    message,
    channels,
  });

  return response.data.data;
};
