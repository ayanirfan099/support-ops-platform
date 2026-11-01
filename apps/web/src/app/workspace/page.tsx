import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@supportops/database";
import { createOrganization } from "@/app/actions";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspaces · SupportOps" };

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const params = await searchParams;

  return (
    <div className="app-frame">
      <aside className="rail">
        <Brand />
        <div>
          <p className="workspace-label">Your workspace</p>
          <p className="panel-copy" style={{ color: "#d2d8e8" }}>
            Select a workspace or create one below.
          </p>
        </div>
        <div className="rail-foot">
          <strong>Support workspace</strong>
          <br />
          Choose a workspace to view its ticket queue.
        </div>
      </aside>
      <div className="main-panel">
        <header className="topbar">
          <span className="topbar-title">Workspace access</span>
          <SignOutButton />
        </header>
        <main className="main-content">
          <p className="kicker">Good to see you, {session.user.name}</p>
          <h1>Your workspaces.</h1>
          <p className="lede">
            Choose a workspace. Membership is resolved from your signed-in
            account; a workspace ID alone never grants access.
          </p>

          {memberships.length > 0 && (
            <section
              className="panel"
              aria-labelledby="workspace-list-title"
              style={{ marginTop: 26 }}
            >
              <h2 className="panel-title" id="workspace-list-title">
                Available to you
              </h2>
              <div className="workspace-list">
                {memberships.map(({ organization, role }) => (
                  <Link
                    className="workspace-item"
                    href={`/workspace/${organization.id}`}
                    key={organization.id}
                  >
                    <strong>{organization.name}</strong>
                    <span className="role-chip">{role}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section
            className="panel"
            aria-labelledby="create-workspace-title"
            style={{ marginTop: 18 }}
          >
            <h2 className="panel-title" id="create-workspace-title">
              Create a workspace
            </h2>
            <p className="panel-copy">
              You will become its owner. Use fictional details while this
              foundation build is under development.
            </p>
            <form action={createOrganization} className="form-stack">
              <label className="field-label">
                Workspace name
                <input
                  autoComplete="organization"
                  maxLength={80}
                  minLength={2}
                  name="name"
                  required
                />
              </label>
              {params.error && (
                <p className="form-status" role="alert">
                  {params.error === "invalid-name"
                    ? "Enter a workspace name between 2 and 80 characters."
                    : "We could not create that workspace. Please try again."}
                </p>
              )}
              <button className="button" type="submit">
                Create workspace
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
