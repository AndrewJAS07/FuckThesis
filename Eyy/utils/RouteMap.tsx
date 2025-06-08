// Updated pathfinding.ts

export interface Point {
  latitude: number;
  longitude: number;
}

interface Node {
  id: string;
  point: Point;
  neighbors: string[];
}

interface PathResult {
  path: string[];
  distance: number;
}

export class PathFinder {
  private nodes: Record<string, Node> = {};
  private initialized = false;

  async fetchRoadNetwork(center: Point, radius: number) {
    // Placeholder: Replace with actual Overpass API fetch logic
    if (this.initialized) return;
    this.initialized = true;
    const node1: Node = {
      id: '1',
      point: { latitude: center.latitude, longitude: center.longitude },
      neighbors: ['2'],
    };
    const node2: Node = {
      id: '2',
      point: { latitude: center.latitude + 0.001, longitude: center.longitude + 0.001 },
      neighbors: ['1'],
    };
    this.nodes = {
      '1': node1,
      '2': node2,
    };
  }

  findNearestOsmNode(point: Point): string | null {
    let closestNodeId: string | null = null;
    let minDist = Infinity;

    for (const [id, node] of Object.entries(this.nodes)) {
      const d = this.haversineDistance(point, node.point);
      if (d < minDist) {
        minDist = d;
        closestNodeId = id;
      }
    }

    return closestNodeId;
  }

  findShortestPath(startId: string, endId: string): PathResult | null {
    if (!this.nodes[startId] || !this.nodes[endId]) return null;

    const visited = new Set<string>();
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const queue: string[] = [];

    for (const nodeId in this.nodes) {
      distances[nodeId] = Infinity;
      previous[nodeId] = null;
      queue.push(nodeId);
    }
    distances[startId] = 0;

    while (queue.length > 0) {
      queue.sort((a, b) => distances[a] - distances[b]);
      const current = queue.shift()!;

      if (current === endId) break;
      visited.add(current);

      for (const neighbor of this.nodes[current].neighbors) {
        if (!visited.has(neighbor)) {
          const alt = distances[current] + this.haversineDistance(this.nodes[current].point, this.nodes[neighbor].point);
          if (alt < distances[neighbor]) {
            distances[neighbor] = alt;
            previous[neighbor] = current;
          }
        }
      }
    }

    const path: string[] = [];
    let u: string | null = endId;
    while (u) {
      path.unshift(u);
      u = previous[u];
    }

    return { path, distance: distances[endId] };
  }

  getNodes(): Record<string, Node> {
    return this.nodes;
  }

  private haversineDistance(p1: Point, p2: Point): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3;
    const dLat = toRad(p2.latitude - p1.latitude);
    const dLon = toRad(p2.longitude - p1.longitude);
    const lat1 = toRad(p1.latitude);
    const lat2 = toRad(p2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
