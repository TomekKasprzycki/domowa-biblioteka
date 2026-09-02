"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReceivedInvite, SentInvite } from "@/app/(app)/friends/friends.types";
import { SendInviteForm } from "@/app/(app)/friends/_components/send-invite-form";
import { ReceivedInvitesList } from "@/app/(app)/friends/_components/received-invites-list";
import { SentInvitesList } from "@/app/(app)/friends/_components/sent-invites-list";
import { Section } from "@/app/_components/section";

const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

function subscribeToLargeScreen(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(LARGE_SCREEN_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function isLargeScreenSnapshot(): boolean {
  return window.matchMedia(LARGE_SCREEN_QUERY).matches;
}

// SSR has no viewport to query — matches the mobile-first default the rest
// of the app assumes when it can't know the client's width yet.
function isLargeScreenServerSnapshot(): boolean {
  return false;
}

export function ManageInvitesSection({
  received,
  sent,
}: {
  received: ReceivedInvite[];
  sent: SentInvite[];
}) {
  // useSyncExternalStore, not an effect + setState: window.matchMedia is
  // exactly the external-store case this hook exists for, and it avoids
  // the extra render-then-correct pass an effect-driven read would need.
  const isLargeScreen = useSyncExternalStore(
    subscribeToLargeScreen,
    isLargeScreenSnapshot,
    isLargeScreenServerSnapshot
  );
  // The user's own toggle, meaningful only below lg — at lg/xl `open` below
  // is forced true regardless, so a stray click there has no visible effect.
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const open = isLargeScreen || manuallyOpen;

  return (
    <details
      open={open}
      onToggle={(event) => setManuallyOpen(event.currentTarget.open)}
      className="group flex flex-col gap-4 rounded-card border border-line bg-paper-card p-4 shadow-card"
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800">
          <span
            aria-hidden="true"
            className="inline-block text-base transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          Manage invites
        </h2>
      </summary>

      <SendInviteForm />

      <Section title="Received" collapsible={false} headingLevel={3}>
        <ReceivedInvitesList invites={received} />
      </Section>

      <Section title="Sent" collapsible={false} headingLevel={3}>
        <SentInvitesList invites={sent} />
      </Section>
    </details>
  );
}
