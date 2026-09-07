import { useEffect, useState } from "react";
import { Bell, Check, LoaderCircle } from "lucide-react";

import {
  getNotifications,
  markNotificationRead,
} from "../services/notificationService";
import { getApiErrorMessage } from "../utils/apiError";
import "./NotificationsPage.css";


function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications() {
      try {
        setLoading(true);
        setError("");
        const data = await getNotifications();
        if (!cancelled) setItems(data?.items ?? []);
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(
            requestError,
            "Không thể tải danh sách thông báo.",
          ));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotifications();
    return () => { cancelled = true; };
  }, []);

  async function handleMarkRead(notificationId) {
    try {
      setMarkingId(notificationId);
      setError("");
      await markNotificationRead(notificationId);
      setItems((current) => current.map((item) => (
        item.id === notificationId
          ? { ...item, isRead: true }
          : item
      )));
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        "Không thể đánh dấu thông báo đã đọc.",
      ));
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <section className="notifications-page">
      <div className="notifications-page__heading">
        <h1>Thông báo</h1>
        <p>Các nhắc nhở xử lý hồ sơ dành cho bạn.</p>
      </div>

      {loading && <div className="notifications-state">Đang tải thông báo...</div>}
      {!loading && error && <div className="notifications-state notifications-state--error" role="alert">{error}</div>}
      {!loading && !error && !items.length && (
        <div className="notifications-state">Bạn chưa có thông báo.</div>
      )}

      {!loading && items.length > 0 && (
        <div className="notifications-list">
          {items.map((item) => (
            <article className={`notification-item${item.isRead ? " notification-item--read" : ""}`} key={item.id}>
              <span className="notification-item__icon" aria-hidden="true"><Bell size={17} /></span>
              <div>
                <header><strong>{item.title}</strong><time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></header>
                <p>{item.message}</p>
                {item.caseCode && <small>Hồ sơ: {item.caseCode}</small>}
              </div>
              {!item.isRead && (
                <button disabled={markingId === item.id} type="button" onClick={() => handleMarkRead(item.id)}>
                  {markingId === item.id ? <LoaderCircle className="cases-spinner" size={14} /> : <Check size={14} />}
                  Đã đọc
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default NotificationsPage;
