import { dijkstra } from './dijkstra'; // Import the dijkstra function

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
  coordinates: Point[];
  instructions: string[];
}

interface OverpassNode {
  type: string;
  id: number;
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: string;
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: (OverpassNode | OverpassWay)[];
}

export class PathFinder {
  private nodes: Record<string, Node> = {};
  private ways: OverpassWay[] = [];
  private osmNodes: Record<string, OverpassNode> = {};
  private initialized = false;
  private lastFetchCenter: Point | null = null;
  private lastFetchRadius = 0;

  /**
   * Fetch road network from OpenStreetMap using Overpass API
   */
  async fetchRoadNetwork(center: Point, radius: number): Promise<void> {
    // Skip if already fetched for this area
    if (this.initialized && 
        this.lastFetchCenter && 
        this.haversineDistance(center, this.lastFetchCenter) < radius * 0.5 &&
        radius <= this.lastFetchRadius) {
      return;
    }

    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["highway"]["highway"!~"footway|cycleway|path|steps|pedestrian"]
           (around:${radius * 1000},${center.latitude},${center.longitude});
      );
      (._;>;);
      out geom;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data: OverpassResponse = await response.json();
      this.processOverpassData(data);
      
      this.initialized = true;
      this.lastFetchCenter = center;
      this.lastFetchRadius = radius;
      
      console.log(`Loaded ${Object.keys(this.nodes).length} nodes and ${this.ways.length} ways`);
    } catch (error) {
      console.error('Failed to fetch road network:', error);
      // Fallback to demo data if API fails
      this.createDemoNetwork(center);
    }
  }

  /**
   * Process Overpass API response and build graph
   */
  private processOverpassData(data: OverpassResponse): void {
    const nodes: Record<string, OverpassNode> = {};
    const ways: OverpassWay[] = [];

    // Separate nodes and ways
    for (const element of data.elements) {
      if (element.type === 'node') {
        const node = element as OverpassNode;
        nodes[node.id.toString()] = node;
      } else if (element.type === 'way') {
        const way = element as OverpassWay;
        if (way.nodes && way.nodes.length > 1) {
          ways.push(way);
        }
      }
    }

    this.osmNodes = nodes;
    this.ways = ways;

    // Build adjacency graph
    this.buildGraph();
  }

  /**
   * Build graph from OSM nodes and ways
   */
  private buildGraph(): void {
    const graph: Record<string, Node> = {};

    // Initialize all nodes
    for (const [nodeId, osmNode] of Object.entries(this.osmNodes)) {
      graph[nodeId] = {
        id: nodeId,
        point: { latitude: osmNode.lat, longitude: osmNode.lon },
        neighbors: []
      };
    }

    // Add connections from ways
    for (const way of this.ways) {
      const isOneWay = way.tags?.oneway === 'yes';
      
      for (let i = 0; i < way.nodes.length - 1; i++) {
        const currentNodeId = way.nodes[i].toString();
        const nextNodeId = way.nodes[i + 1].toString();

        if (graph[currentNodeId] && graph[nextNodeId]) {
          // Add forward connection
          if (!graph[currentNodeId].neighbors.includes(nextNodeId)) {
            graph[currentNodeId].neighbors.push(nextNodeId);
          }

          // Add backward connection if not one-way
          if (!isOneWay && !graph[nextNodeId].neighbors.includes(currentNodeId)) {
            graph[nextNodeId].neighbors.push(currentNodeId);
          }
        }
      }
    }

    // Filter out isolated nodes (nodes with no connections)
    this.nodes = {};
    for (const [nodeId, node] of Object.entries(graph)) {
      if (node.neighbors.length > 0) {
        this.nodes[nodeId] = node;
      }
    }
  }

  /**
   * Create demo network if API fails
   */
  private createDemoNetwork(center: Point): void {
    this.nodes = {};
    const gridSize = 5;
    const step = 0.001;

    // Create a grid of nodes
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const nodeId = `${i}-${j}`;
        const neighbors: string[] = [];

        // Add connections to adjacent nodes
        if (i > 0) neighbors.push(`${i - 1}-${j}`);
        if (i < gridSize - 1) neighbors.push(`${i + 1}-${j}`);
        if (j > 0) neighbors.push(`${i}-${j - 1}`);
        if (j < gridSize - 1) neighbors.push(`${i}-${j + 1}`);

        this.nodes[nodeId] = {
          id: nodeId,
          point: {
            latitude: center.latitude + (i - gridSize/2) * step,
            longitude: center.longitude + (j - gridSize/2) * step
          },
          neighbors
        };
      }
    }

    this.initialized = true;
    console.log('Created demo network with', Object.keys(this.nodes).length, 'nodes');
  }

  /**
   * Find the nearest road node to a given point
   */
  findNearestNode(point: Point): string | null {
    if (Object.keys(this.nodes).length === 0) {
      return null;
    }

    let closestNodeId: string | null = null;
    let minDistance = Infinity;

    for (const [nodeId, node] of Object.entries(this.nodes)) {
      const distance = this.haversineDistance(point, node.point);
      if (distance < minDistance) {
        minDistance = distance;
        closestNodeId = nodeId;
      }
    }

    return closestNodeId;
  }

  /**
   * Convert PathFinder graph to Dijkstra-compatible graph format
   */
  private convertGraphToDijkstraFormat(): Record<string, Record<string, number>> {
    const graph: Record<string, Record<string, number>> = {};

    for (const [nodeId, node] of Object.entries(this.nodes)) {
      graph[nodeId] = {};
      for (const neighborId of node.neighbors) {
        const distance = this.haversineDistance(node.point, this.nodes[neighborId].point);
        graph[nodeId][neighborId] = distance;
      }
    }

    return graph;
  }

  /**
   * Find shortest path using Dijkstra's algorithm
   */
  findShortestPath(startId: string, endId: string): PathResult | null {
    if (!this.nodes[startId] || !this.nodes[endId]) {
      console.error('Start or end node not found');
      return null;
    }

    // Convert graph to Dijkstra-compatible format
    const graph = this.convertGraphToDijkstraFormat();

    // Use Dijkstra's algorithm to find the shortest path
    const result = dijkstra(graph, startId, endId);

    if (!result.path || result.path.length === 0) {
      console.error('No path found between nodes');
      return null;
    }

    // Generate coordinates and instructions
    const coordinates = result.path.map(nodeId => this.nodes[nodeId].point);
    const instructions = this.generateInstructions(result.path);

    return {
      path: result.path,
      distance: result.distance,
      coordinates,
      instructions,
    };
  }

  /**
   * Find path between two geographic points
   */
  async findPath(start: Point, end: Point, searchRadius = 1): Promise<PathResult | null> {
    // Ensure road network is loaded
    const center = {
      latitude: (start.latitude + end.latitude) / 2,
      longitude: (start.longitude + end.longitude) / 2
    };
    
    await this.fetchRoadNetwork(center, searchRadius);

    // Find nearest nodes
    const startNodeId = this.findNearestNode(start);
    const endNodeId = this.findNearestNode(end);

    if (!startNodeId || !endNodeId) {
      console.error('Could not find nearest nodes');
      return null;
    }

    console.log(`Pathfinding from node ${startNodeId} to node ${endNodeId}`);
    return this.findShortestPath(startNodeId, endNodeId);
  }

  /**
   * Generate turn-by-turn instructions
   */
  private generateInstructions(path: string[]): string[] {
    const instructions: string[] = [];
    
    if (path.length < 2) return instructions;

    instructions.push('Start your journey');

    for (let i = 1; i < path.length - 1; i++) {
      const prevPoint = this.nodes[path[i - 1]].point;
      const currentPoint = this.nodes[path[i]].point;
      const nextPoint = this.nodes[path[i + 1]].point;

      const bearing1 = this.calculateBearing(prevPoint, currentPoint);
      const bearing2 = this.calculateBearing(currentPoint, nextPoint);
      const turn = this.calculateTurnDirection(bearing1, bearing2);

      const distance = this.haversineDistance(currentPoint, nextPoint);
      const distanceText = distance > 1000 ? 
        `${(distance / 1000).toFixed(1)} km` : 
        `${Math.round(distance)} m`;

      if (turn !== 'straight') {
        instructions.push(`${turn.charAt(0).toUpperCase() + turn.slice(1)} and continue for ${distanceText}`);
      } else if (distance > 500) {
        instructions.push(`Continue straight for ${distanceText}`);
      }
    }

    instructions.push('You have arrived at your destination');
    return instructions;
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(p1: Point, p2: Point): number {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const dLon = toRad(p2.longitude - p1.longitude);
    const lat1 = toRad(p1.latitude);
    const lat2 = toRad(p2.latitude);

    const x = Math.sin(dLon) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = toDeg(Math.atan2(x, y));
    return (bearing + 360) % 360;
  }

  /**
   * Calculate turn direction based on bearing change
   */
  private calculateTurnDirection(bearing1: number, bearing2: number): string {
    let diff = bearing2 - bearing1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 15) return 'straight';
    if (diff > 15 && diff < 45) return 'slight right';
    if (diff >= 45 && diff < 135) return 'turn right';
    if (diff >= 135) return 'sharp right';
    if (diff < -15 && diff > -45) return 'slight left';
    if (diff <= -45 && diff > -135) return 'turn left';
    if (diff <= -135) return 'sharp left';
    
    return 'straight';
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private haversineDistance(p1: Point, p2: Point): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3; // Earth's radius in meters
    
    const dLat = toRad(p2.latitude - p1.latitude);
    const dLon = toRad(p2.longitude - p1.longitude);
    const lat1 = toRad(p1.latitude);
    const lat2 = toRad(p2.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get all loaded nodes (for debugging/visualization)
   */
  getNodes(): Record<string, Node> {
    return this.nodes;
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): { nodeCount: number; connectionCount: number; isInitialized: boolean } {
    const connectionCount = Object.values(this.nodes)
      .reduce((total, node) => total + node.neighbors.length, 0);

    return {
      nodeCount: Object.keys(this.nodes).length,
      connectionCount,
      isInitialized: this.initialized
    };
  }

  /**
   * Search for locations by name using Nominatim API
   */
  async searchLocation(query: string): Promise<Point[]> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      );
      
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results = await response.json();
      return results.map((result: any) => ({
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      }));
    } catch (error) {
      console.error('Failed to search location:', error);
      return [];
    }
  }
}