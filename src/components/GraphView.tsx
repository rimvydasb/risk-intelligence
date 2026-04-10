"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import type { Core, ElementDefinition } from "cytoscape";

export interface GraphViewProps {
  elements?: ElementDefinition[];
}

const defaultElements: ElementDefinition[] = [
  { data: { id: "account-A", label: "Account A" } },
  { data: { id: "account-B", label: "Account B" } },
  { data: { id: "account-C", label: "Account C" } },
  { data: { id: "tx-1", source: "account-A", target: "account-B", label: "$5,000" } },
  { data: { id: "tx-2", source: "account-B", target: "account-C", label: "$4,800" } },
];

export default function GraphView({ elements = defaultElements }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    let cy: Core | null = null;

    async function initCytoscape() {
      if (!containerRef.current) return;

      const cytoscape = (await import("cytoscape")).default;

      cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#1976d2",
              color: "#fff",
              "text-valign": "center",
              "text-halign": "center",
              width: 80,
              height: 40,
              shape: "round-rectangle",
              "font-size": 12,
            },
          },
          {
            selector: "edge",
            style: {
              label: "data(label)",
              width: 2,
              "line-color": "#90caf9",
              "target-arrow-color": "#90caf9",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "font-size": 10,
              "text-rotation": "autorotate",
            },
          },
        ],
        layout: {
          name: "breadthfirst",
          directed: true,
          padding: 20,
        },
      });

      cyRef.current = cy;
    }

    initCytoscape();

    return () => {
      cy?.destroy();
      cyRef.current = null;
    };
  }, [elements]);

  return (
    <Box
      ref={containerRef}
      data-testid="graph-container"
      sx={{
        width: "100%",
        height: 500,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        mt: 2,
      }}
    />
  );
}
