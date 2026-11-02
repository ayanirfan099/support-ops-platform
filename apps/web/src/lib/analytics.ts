import { db } from "@supportops/database";

const activeStatuses = ["new", "open", "pending"] as const;
const MAX_ASSIGNMENTS = 500;

export async function getWorkspaceMetrics(
  organizationId: string,
  now = new Date(),
) {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeWhere = {
    organizationId,
    status: { in: [...activeStatuses] },
  };
  const [
    active,
    total,
    unassigned,
    urgent,
    slaAtRisk,
    createdLast7Days,
    resolvedLast7Days,
    queueCounts,
    statusCounts,
    priorityCounts,
    assignments,
    triageReviews,
    knowledgeSearchesLast7Days,
  ] = await Promise.all([
    db.ticket.count({ where: activeWhere }),
    db.ticket.count({ where: { organizationId } }),
    db.ticket.count({
      where: {
        ...activeWhere,
        assignments: { none: { endedAt: null } },
      },
    }),
    db.ticket.count({
      where: { ...activeWhere, priority: "urgent" },
    }),
    db.ticket.count({
      where: {
        ...activeWhere,
        slaTargetAt: { lte: now },
      },
    }),
    db.ticket.count({ where: { organizationId, createdAt: { gte: since } } }),
    db.ticket.count({
      where: {
        organizationId,
        status: { in: ["resolved", "closed"] },
        resolvedAt: { gte: since },
      },
    }),
    db.ticket.groupBy({
      by: ["queue"],
      where: activeWhere,
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ["status"],
      where: activeWhere,
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ["priority"],
      where: activeWhere,
      _count: { _all: true },
    }),
    db.assignment.findMany({
      where: {
        organizationId,
        endedAt: null,
        ticket: { is: { status: { in: [...activeStatuses] } } },
      },
      orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
      take: MAX_ASSIGNMENTS + 1,
      select: {
        membershipId: true,
        membership: { select: { user: { select: { name: true } } } },
      },
    }),
    db.classificationSuggestion.groupBy({
      by: ["reviewStatus"],
      where: {
        organizationId,
        reviewedAt: { gte: since },
        reviewStatus: { in: ["accepted", "overridden"] },
      },
      _count: { _all: true },
    }),
    db.knowledgeSearch.count({
      where: { organizationId, createdAt: { gte: since } },
    }),
  ]);

  const workloads = new Map<
    string,
    { membershipId: string; name: string; activeTickets: number }
  >();
  for (const assignment of assignments.slice(0, MAX_ASSIGNMENTS)) {
    const current = workloads.get(assignment.membershipId);
    if (current) current.activeTickets += 1;
    else {
      workloads.set(assignment.membershipId, {
        membershipId: assignment.membershipId,
        name: assignment.membership.user.name,
        activeTickets: 1,
      });
    }
  }
  const reviews = Object.fromEntries(
    triageReviews.map(({ reviewStatus, _count }) => [
      reviewStatus,
      _count._all,
    ]),
  );

  return {
    active,
    total,
    unassigned,
    urgent,
    slaAtRisk,
    createdLast7Days,
    resolvedLast7Days,
    knowledgeSearchesLast7Days,
    triageAcceptedLast7Days: reviews.accepted ?? 0,
    triageOverriddenLast7Days: reviews.overridden ?? 0,
    triageAcceptanceRateLast7Days:
      (reviews.accepted ?? 0) + (reviews.overridden ?? 0) > 0
        ? Math.round(
            ((reviews.accepted ?? 0) /
              ((reviews.accepted ?? 0) + (reviews.overridden ?? 0))) *
              100,
          )
        : null,
    agentWorkload: [...workloads.values()].sort(
      (left, right) =>
        right.activeTickets - left.activeTickets ||
        left.name.localeCompare(right.name),
    ),
    agentWorkloadTruncated: assignments.length > MAX_ASSIGNMENTS,
    byQueue: queueCounts.map(({ queue, _count }) => ({
      queue: queue ?? "untriaged",
      count: _count._all,
    })),
    byStatus: statusCounts.map(({ status, _count }) => ({
      status,
      count: _count._all,
    })),
    byPriority: priorityCounts.map(({ priority, _count }) => ({
      priority,
      count: _count._all,
    })),
  };
}
