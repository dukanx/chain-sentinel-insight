import { createFileRoute } from "@tanstack/react-router";
import { ChainSightApp } from "@/components/chainsight/ChainSightApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentinelFlow — Deposit Screening" },
      {
        name: "description",
        content:
          "Sanctions & AML deposit screening for crypto exchanges — real-time risk graph, case review, SAR drafts, and audit trail.",
      },
      { property: "og:title", content: "SentinelFlow — Deposit Screening" },
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
