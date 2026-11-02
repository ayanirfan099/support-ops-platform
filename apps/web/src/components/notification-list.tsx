"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NotificationItem {
  id: string;
  type: "assignment" | "mention";
  summary: string;
  createdAt: string;
  readAt: string | null;
  ticket: { id: string; subject: string };
}

export function NotificationList({
  organizationId,
  items,
}: {
  organizationId: string;
  items: NotificationItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markRead(notificationId: string) {
    setPendingId(notificationId);
    setError(null);
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!response.ok)
        throw new Error("The notification could not be updated.");
      router.refresh();
    } catch {
      setError("Could not mark the notification as read. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="empty-state">You’re all caught up. No notifications yet.</p>
    );
  }

  return (
    <>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="activity-list notification-list">
        {items.map((item) => (
          <li className="activity-item" key={item.id}>
            <div className="activity-copy">
              <strong>{item.summary}</strong>
              <span>
                <Link
                  href={`/workspace/${organizationId}/tickets/${item.ticket.id}`}
                >
                  {item.ticket.subject}
                </Link>
                {" · "}
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(item.createdAt))}{" "}
                UTC
              </span>
            </div>
            <div className="notification-actions">
              {item.readAt ? (
                <span className="status-pill">Read</span>
              ) : (
                <>
                  <span className="status-pill status-pill-unread">Unread</span>
                  <button
                    className="button secondary compact-button"
                    type="button"
                    disabled={pendingId === item.id}
                    onClick={() => void markRead(item.id)}
                  >
                    {pendingId === item.id ? "Saving…" : "Mark read"}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
