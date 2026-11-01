import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MembershipRequiredError } from "@supportops/contracts";
import { db } from "@supportops/database";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { requireWorkspaceMembership } from "@/lib/authorization";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace · SupportOps" };

export default async function OrganizationHome({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { organizationId } = await params;

  let membership;
  try {
    membership = await requireWorkspaceMembership(organizationId);
  } catch (error) {
    if (error instanceof MembershipRequiredError) notFound();
    throw error;
  }

  const organization = await db.organization.findUnique({
    where: { id: membership.organizationId },
    select: { id: true, name: true },
  });
  if (!organization) notFound();

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <nav aria-label="Workspace navigation">
          <p className="workspace-label">Workspace</p>
          <span className="nav-link active" aria-current="page">
            <span aria-hidden="true">◈</span> Overview
          </span>
          <span className="nav-link" aria-disabled="true">
            <span aria-hidden="true">▤</span> Tickets · M2
          </span>
          <span className="nav-link" aria-disabled="true">
            <span aria-hidden="true">⌕</span> Knowledge · M3
          </span>
        </nav>
        <div className="rail-foot">
          <strong>Human-reviewed by design</strong>
          <br />
          Routing suggestions will never replace an agent decision.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">{organization.name}</span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <p className="kicker">Workspace · {membership.role}</p>
          <h1>{organization.name}</h1>
          <p className="lede">
            Your workspace is ready. The foundation milestone provides account
            and membership scaffolding; ticket operations arrive in M2.
          </p>
          <section
            className="panel"
            aria-labelledby="foundation-title"
            style={{ marginTop: 28 }}
          >
            <h2 className="panel-title" id="foundation-title">
              Foundation is in place.
            </h2>
            <p className="panel-copy">
              You are signed in as <strong>{session.user.email}</strong> with
              the <strong>{membership.role}</strong> role. This page was loaded
              only after the server confirmed your membership in this workspace.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Link className="button secondary" href="/workspace">
                Switch workspace
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
