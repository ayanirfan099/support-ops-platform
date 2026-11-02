import Link from "next/link";
import type { MemberRole } from "@supportops/contracts";

export type WorkspaceNavItem =
  | "overview"
  | "tickets"
  | "knowledge"
  | "notifications"
  | "audit";

export function WorkspaceNav({
  organizationId,
  role,
  active,
}: {
  organizationId: string;
  role: MemberRole;
  active: WorkspaceNavItem;
}) {
  const items: {
    id: WorkspaceNavItem;
    label: string;
    href: string;
    icon: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      href: `/workspace/${organizationId}`,
      icon: "◈",
    },
    {
      id: "tickets",
      label: "Tickets",
      href: `/workspace/${organizationId}/tickets`,
      icon: "▤",
    },
    {
      id: "knowledge",
      label: "Knowledge",
      href: `/workspace/${organizationId}/knowledge`,
      icon: "⌕",
    },
    {
      id: "notifications",
      label: "Notifications",
      href: `/workspace/${organizationId}/notifications`,
      icon: "♧",
    },
  ];
  if (role === "owner" || role === "manager") {
    items.push({
      id: "audit",
      label: "Activity log",
      href: `/workspace/${organizationId}/audit`,
      icon: "◷",
    });
  }

  return (
    <nav aria-label="Workspace navigation">
      <p className="workspace-label">Workspace</p>
      {items.map((item) =>
        item.id === active ? (
          <span className="nav-link active" aria-current="page" key={item.id}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </span>
        ) : (
          <Link className="nav-link" href={item.href} key={item.id}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
