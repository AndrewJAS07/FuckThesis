interface Point {
  latitude: number;
  longitude: number;
}

interface GraphNode {
  id: string;
  point: Point;
  neighbors: { [key: string]: number }; // neighbor id -> distance
}

interface OSMNode {
  id: number;
  lat: number;
  lon: number;
}

interface OSMWay {
  id: number;
  nodes: number[];
  tags: {
    highway?: string;
    [key: string]: string | undefined;
  };
}

class PathFinder {
  private nodes: { [key: string]: GraphNode } = {};
  private osmNodes: { [key: string]: OSMNode } = {};
  private osmWays: { [key: string]: OSMWay } = {};
  private isInitialized: boolean = false;

  // Calculate distance between two points using Haversine formula
  private calculateDistance(point1: Point, point2: Point): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Fetch road network data from OpenStreetMap
  async fetchRoadNetwork(center: Point, radius: number = 1000): Promise<void> {
    try {
      console.log(`Fetching road network data around ${center.latitude},${center.longitude} with radius ${radius}m`);
      // Clear existing data
      this.nodes = {};
      this.osmNodes = {};
      this.osmWays = {};
      this.isInitialized = false;

      // Overpass API query to fetch roads and nodes within radius
      const query = `
        [out:json][timeout:25];
        (
          way["highway"](around:${radius},${center.latitude},${center.longitude});
          node(w);
        );
        out body;
      `;

      console.log('Overpass query:', query);

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch road network data. Response:', errorText);
        throw new Error(`Failed to fetch road network data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OSM data fetched.', { elements: data.elements.length });

      // Process nodes and ways separately first
      data.elements.forEach((element: any) => {
        if (element.type === 'node') {
          this.osmNodes[element.id] = {
            id: element.id,
            lat: element.lat,
            lon: element.lon,
          };
        } else if (element.type === 'way') {
          // Filter out non-road ways if necessary, although the query should handle this
          if (element.tags.highway && !['footway', 'path', 'track', 'pedestrian', 'cycleway', 'steps', 'bridleway', 'service'].includes(element.tags.highway)) {
            this.osmWays[element.id] = {
              id: element.id,
              nodes: element.nodes,
              tags: element.tags,
            };
          }
        }
      });
      console.log('Processed OSM data.', { osmNodes: Object.keys(this.osmNodes).length, osmWays: Object.keys(this.osmWays).length });

      // Build graph from OSM data
      await this.buildGraphFromOSM();
      this.isInitialized = true;
      console.log('PathFinder initialized with graph.', { nodes: Object.keys(this.nodes).length });
    } catch (error) {
      console.error('Error fetching road network:', error);
      throw error;
    }
  }

  // Build graph from OSM data
  private async buildGraphFromOSM(): Promise<void> {
    // Add OSM nodes to graph
    Object.values(this.osmNodes).forEach((osmNode) => {
      this.addNode(`osm_${osmNode.id}`, {
        latitude: osmNode.lat,
        longitude: osmNode.lon,
      });
    });
    console.log('Added OSM nodes to graph.', { nodes: Object.keys(this.nodes).length });

    // Add edges from ways
    Object.values(this.osmWays).forEach((way) => {
      for (let i = 0; i < way.nodes.length - 1; i++) {
        const node1Id = `osm_${way.nodes[i]}`;
        const node2Id = `osm_${way.nodes[i + 1]}`;
        if (this.nodes[node1Id] && this.nodes[node2Id]) {
          this.addEdge(node1Id, node2Id);
        }
      }
    });
    console.log('Added edges from OSM ways.');
  }

  // Add a node to the graph
  addNode(id: string, point: Point) {
    this.nodes[id] = {
      id,
      point,
      neighbors: {},
    };
  }

  // Add an edge between two nodes
  addEdge(node1Id: string, node2Id: string) {
    const node1 = this.nodes[node1Id];
    const node2 = this.nodes[node2Id];

    if (!node1 || !node2) {
      // console.warn(`Attempted to add edge between non-existent nodes: ${node1Id}, ${node2Id}`);
      return; // Silently fail if nodes don't exist
    }

    const distance = this.calculateDistance(node1.point, node2.point);
    node1.neighbors[node2Id] = distance;
    node2.neighbors[node1Id] = distance;
  }

  // Find the nearest OSM node to a given point, prioritizing nodes that are part of a way
  findNearestOsmNode(point: Point, searchRadius: number = 500): string | null {
    if (!this.isInitialized || Object.keys(this.osmNodes).length === 0) {
      console.warn('PathFinder not initialized or no OSM nodes available for nearest OSM node search.');
      return null;
    }

    let nearestNodeId: string | null = null;
    let minDistance = Infinity;
    const nodesInWays = new Set<string>();

    // Populate nodesInWays set with OSM node IDs
    Object.values(this.osmWays).forEach(way => {
      way.nodes.forEach(nodeId => {
        nodesInWays.add(`osm_${nodeId}`);
      });
    });

    // First attempt: Find nearest node that is part of a way within the search radius
    for (const osmNodeId in this.osmNodes) {
      const osmNode = this.osmNodes[osmNodeId];
      const nodePoint = { latitude: osmNode.lat, longitude: osmNode.lon };
      const distance = this.calculateDistance(point, nodePoint);

      if (distance <= searchRadius && nodesInWays.has(`osm_${osmNodeId}`)) {
        if (distance < minDistance) {
          minDistance = distance;
          nearestNodeId = `osm_${osmNodeId}`;
        }
      }
    }

    // Second attempt: If no node found in ways, try any node within an expanded radius
    if (!nearestNodeId) {
      const expandedRadius = searchRadius * 1.5;
      for (const osmNodeId in this.osmNodes) {
        const osmNode = this.osmNodes[osmNodeId];
        const nodePoint = { latitude: osmNode.lat, longitude: osmNode.lon };
        const distance = this.calculateDistance(point, nodePoint);

        if (distance <= expandedRadius) {
          if (distance < minDistance) {
            minDistance = distance;
            nearestNodeId = `osm_${osmNodeId}`;
          }
        }
      }
    }

    // Final attempt: If still no node found, use the absolute nearest node regardless of distance
    if (!nearestNodeId) {
      for (const osmNodeId in this.osmNodes) {
        const osmNode = this.osmNodes[osmNodeId];
        const nodePoint = { latitude: osmNode.lat, longitude: osmNode.lon };
        const distance = this.calculateDistance(point, nodePoint);

        if (distance < minDistance) {
          minDistance = distance;
          nearestNodeId = `osm_${osmNodeId}`;
        }
      }
    }

    return nearestNodeId;
  }

  // Find the shortest path using Dijkstra's algorithm
  findShortestPath(startId: string, endId: string): { path: string[]; distance: number } | null {
    if (!this.isInitialized || !this.nodes[startId] || !this.nodes[endId]) {
      console.warn('PathFinder not initialized or start/end nodes not found for pathfinding.', { 
        isInitialized: this.isInitialized, 
        startNodeExists: !!this.nodes[startId], 
        endNodeExists: !!this.nodes[endId] 
      });
      return null;
    }

    console.log('Attempting to find shortest path between', startId, 'and', endId);

    // Initialize data structures
    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: string | null } = {};
    const visited = new Set<string>();
    const unvisited = new Set<string>();

    // Initialize distances and unvisited set
    for (const nodeId in this.nodes) {
      distances[nodeId] = Infinity;
      previous[nodeId] = null;
      unvisited.add(nodeId);
    }
    distances[startId] = 0;

    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest distance
      let currentId = '';
      let smallestDistance = Infinity;
      
      for (const nodeId of unvisited) {
        if (distances[nodeId] < smallestDistance) {
          smallestDistance = distances[nodeId];
          currentId = nodeId;
        }
      }

      // If we can't find a node with finite distance, there's no path
      if (smallestDistance === Infinity) {
        console.warn('No path found: All remaining nodes are unreachable.');
        return null;
      }

      // If we've reached the destination, we can stop
      if (currentId === endId) {
        console.log('Reached destination node in pathfinding.');
        break;
      }

      // Mark current node as visited
      unvisited.delete(currentId);
      visited.add(currentId);

      // Update distances to neighbors
      const currentNode = this.nodes[currentId];
      for (const neighborId in currentNode.neighbors) {
        // Skip if neighbor is already visited
        if (visited.has(neighborId)) continue;

        const distance = distances[currentId] + currentNode.neighbors[neighborId];
        
        // Only update if we found a shorter path
        if (distance < distances[neighborId]) {
          distances[neighborId] = distance;
          previous[neighborId] = currentId;
        }
      }
    }

    // Reconstruct the path
    const path: string[] = [];
    let currentId = endId;

    // If we couldn't reach the end node, return null
    if (distances[endId] === Infinity) {
      console.warn('No path found: End node is unreachable.');
      return null;
    }

    // Reconstruct path from end to start
    while (currentId !== startId) {
      path.unshift(currentId);
      const prevId = previous[currentId];
      
      // Safety check for invalid path
      if (prevId === null) {
        console.warn('Path reconstruction failed: Invalid previous node reference.');
        return null;
      }
      
      currentId = prevId;
    }
    
    // Add the start node
    path.unshift(startId);

    // Validate the path
    if (path.length < 2) {
      console.warn('Invalid path: Path is too short.');
      return null;
    }

    // Validate that all nodes in the path exist and are connected
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = this.nodes[path[i]];
      const nextNode = this.nodes[path[i + 1]];
      
      if (!currentNode || !nextNode || !currentNode.neighbors[path[i + 1]]) {
        console.warn('Invalid path: Nodes are not properly connected.');
        return null;
      }
    }

    console.log('Path reconstructed successfully.', { 
      path, 
      distance: distances[endId],
      nodeCount: path.length 
    });

    return {
      path,
      distance: distances[endId],
    };
  }

  // Get coordinates for a path
  getPathCoordinates(path: string[]): Point[] {
    return path.map((nodeId) => this.nodes[nodeId]?.point).filter(point => point !== undefined) as Point[];
  }

  // Public method to access nodes for debugging (use with caution)
  public getNodes() {
    return this.nodes;
  }

  public getOsmNodes() {
    return this.osmNodes;
  }

  public getOsmWays() {
    return this.osmWays;
  }
}

export { PathFinder, Point, GraphNode }; 