/**
 * API Contract Types for Roll a Ball
 * Strictly matches docs/API.md
 */

export interface ApiHealthResponse {
  status: 'ok';
  service: string;
  version: string;
}

export interface DijkstraEdge {
  from: string;
  to: string;
  weight: number;
}

export interface DijkstraBlockedEdge {
  from: string;
  to: string;
}

export interface DijkstraGraph {
  nodes: string[];
  edges: DijkstraEdge[];
  blocked_edges?: DijkstraBlockedEdge[];
}

export interface DijkstraRequest {
  graph: DijkstraGraph;
  source: string;
  destination: string;
  include_trace?: boolean;
}

export type DijkstraTraceEvent = 'initialize' | 'visit' | 'relax_edge';

export interface DijkstraTraceStep {
  step: number;
  event: DijkstraTraceEvent;
  node?: string;
  distance?: number;
  from?: string;
  to?: string;
  new_distance?: number;
}

export interface DijkstraSuccessResponse {
  success: true;
  algorithm: 'dijkstra';
  reachable: boolean;
  path: string[];
  total_cost: number | null;
  trace: DijkstraTraceStep[];
}

export interface KnapsackCoinItem {
  id: string;
  cost: number;
  value: number;
}

export interface KnapsackRequest {
  budget: number;
  coins: KnapsackCoinItem[];
  include_trace?: boolean;
}

export interface KnapsackSuccessResponse {
  success: true;
  algorithm: 'knapsack';
  budget: number;
  selected_coin_ids: string[];
  total_cost: number;
  maximum_score: number;
  trace: {
    dp_table?: number[][];
  };
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: string[];
    request_id: string;
  };
}

export type DijkstraResponse = DijkstraSuccessResponse | ApiErrorEnvelope;
export type KnapsackResponse = KnapsackSuccessResponse | ApiErrorEnvelope;
