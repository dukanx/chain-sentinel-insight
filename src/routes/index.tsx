import { createFileRoute } from "@tanstack/react-router";
import { ChainSightApp } from "@/components/chainsight/ChainSightApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChainSight — Deposit Screening" },
      {
        name: "description",
        content:
          "Pitch prototype for crypto exchange deposit screening — Command Center, SAR drafts, audit log, and KYT behavioral demos.",
      },
      { property: "og:title", content: "ChainSight — Deposit Screening" },
      {
        property: "og:description",
        content:
          "Sanctions-exposure screening for crypto exchange deposits, with on-chain transaction-graph evidence.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <ChainSightApp />;
}
