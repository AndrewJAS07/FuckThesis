// For Node.js environment, uncomment and install 'node-fetch'
// import fetch from 'node-fetch';
// (global as any).fetch = fetch;

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
    oneway?: string;
    access?: string;
    maxspeed?: string;
    junction?: string;
    [key: string]: string | undefined;
  };
}

interface PathResult {
  path: string[];
  distance: number;
  estimatedTime: number;
  fare: number;
}

class PathFinder {
  private nodes: { [key: string]: GraphNode } = {};
  private osmNodes: { [key: string]: OSMNode } = {};
  private osmWays: { [key: string]: OSMWay } = {};
  private isInitialized: boolean = false;
  private osmCache: { [key: string]: { data: any; timestamp: number } } = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  // Constants for fare calculation
  private readonly BASE_FARE = 15;
  private readonly RATE_PER_KM = 11;
  private readonly BASE_KM = 1;
  private readonly AVERAGE_SPEED_KMH = 40; // Used for general time estimation if specific speed limits aren't available

  // Road type categories for more robust handling
  private readonly ROAD_TYPES = {
    MOTORWAY: ['motorway', 'motorway_link'],
    TRUNK: ['trunk', 'trunk_link'],
    PRIMARY: ['primary', 'primary_link'],
    SECONDARY: ['secondary', 'secondary_link'],
    TERTIARY: ['tertiary', 'tertiary_link'],
    RESIDENTIAL: ['residential', 'unclassified', 'living_street'],
    SERVICE: ['service']
  };

  private readonly DEFAULT_SPEEDS: { [key: string]: number } = {
    motorway: 100,
    trunk: 80,
    primary: 60,
    secondary: 50,
    tertiary: 40,
    residential: 30,
    service: 20,
    unclassified: 30, // Default for unclassified roads
    living_street: 15 // Lower speed for living streets
  };

  constructor() {
    // Bind methods if they are passed as callbacks where `this` context is lost
    this.calculateDistance = this.calculateDistance.bind(this);
    this.fetchRoadNetwork = this.fetchRoadNetwork.bind(this);
    this.processOSMData = this.processOSMData.bind(this);
    this.buildGraphFromOSM = this.buildGraphFromOSM.bind(this);
    this.findShortestPath = this.findShortestPath.bind(this);
  }

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

  /**
   * Fetches road network data from Overpass API, with retry logic and caching.
   * @param center The center point for the query.
   * @param radius The radius in meters around the center to query.
   */
  async fetchRoadNetwork(center: Point, radius: number = 1000): Promise<void> {
    const cacheKey = `${center.latitude},${center.longitude},${radius}`;
    const cachedData = this.osmCache[cacheKey];

    if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_DURATION) {
      console.log('Using cached OSM data');
      await this.processOSMData(cachedData.data);
      return;
    }

    let retryCount = 0;
    while (retryCount < this.MAX_RETRIES) {
      try {
        console.log(`Fetching road network data around ${center.latitude},${center.longitude} with radius ${radius}m (attempt ${retryCount + 1})`);
        
        // Clear existing data before fetching new data
        this.nodes = {};
        this.osmNodes = {};
        this.osmWays = {};
        this.isInitialized = false;

        // Optimized Overpass API query for relevant highway types
        const highwayTypes = Object.values(this.ROAD_TYPES).flat().join('|');
        const query = `
          [out:json][timeout:25];
          (
            way["highway"~"^(${highwayTypes})$"](around:${radius},${center.latitude},${center.longitude});
            node(w);
            >;
          );
          out body;
        `;

        // Ensure fetch is available (e.g., polyfilled for Node.js)
        if (typeof fetch === 'undefined') {
          throw new Error('fetch is not defined. Please ensure it is polyfilled for Node.js environments or run in a browser.');
        }

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch road network data:', errorText);
          throw new Error(`Failed to fetch road network data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OSM data fetched successfully', { elements: data.elements.length });

        // Cache the successful response
        this.osmCache[cacheKey] = {
          data,
          timestamp: Date.now(),
        };

        // Process the data
        await this.processOSMData(data);
        return;

      } catch (error) {
        console.error(`Error fetching road network (attempt ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retryCount));
        } else {
          throw new Error('Failed to fetch road network after multiple attempts');
        }
      }
    }
  }

  /**
   * Processes the raw OSM data to populate osmNodes and osmWays.
   * @param data The raw JSON data from Overpass API.
   */
  private async processOSMData(data: any): Promise<void> {
    try {
      // Clear existing data before processing new data
      this.osmNodes = {};
      this.osmWays = {};
      this.nodes = {}; // Clear graph nodes as well

      data.elements.forEach((element: any) => {
        if (element.type === 'node') {
          this.osmNodes[element.id] = {
            id: element.id,
            lat: element.lat,
            lon: element.lon,
          };
        } else if (element.type === 'way') {
          if (this.isValidRoadWay(element)) {
            this.osmWays[element.id] = {
              id: element.id,
              nodes: element.nodes,
              tags: element.tags,
            };
          }
        }
      });

      console.log('Processed raw OSM data', {
        osmNodesCount: Object.keys(this.osmNodes).length,
        osmWaysCount: Object.keys(this.osmWays).length
      });

      // Build graph from processed OSM data
      await this.buildGraphFromOSM();
      this.isInitialized = true;
      console.log('PathFinder initialized with graph', {
        graphNodesCount: Object.keys(this.nodes).length
      });
    } catch (error) {
      console.error('Error processing OSM data:', error);
      throw error;
    }
  }

  /**
   * Validates if an OSM way represents a road that should be included in the graph.
   * @param way The OSM way object.
   * @returns True if the way is a valid road, false otherwise.
   */
  private isValidRoadWay(way: any): boolean {
    if (!way.tags?.highway || !way.nodes || way.nodes.length < 2) {
      return false;
    }

    const roadType = way.tags.highway;
    // Check if the road type is in our defined categories
    const validRoadTypes = Object.values(this.ROAD_TYPES).flat();
    return validRoadTypes.includes(roadType);
  }

  /**
   * Builds the graph (nodes and edges) from the processed OSM data.
   */
  private async buildGraphFromOSM(): Promise<void> {
    // Add OSM nodes to graph
    Object.values(this.osmNodes).forEach((osmNode) => {
      this.addNode(`osm_${osmNode.id}`, {
        latitude: osmNode.lat,
        longitude: osmNode.lon,
      });
    });

    // Add edges from ways
    Object.values(this.osmWays).forEach((way) => {
      const roadType = way.tags.highway;
      if (!roadType) return; // Should not happen if isValidRoadWay passed

      const speedLimit = this.getSpeedLimit(way.tags);
      const isOneWay = this.isOneWayStreet(way.tags, roadType);

      for (let i = 0; i < way.nodes.length - 1; i++) {
        const node1Id = `osm_${way.nodes[i]}`;
        const node2Id = `osm_${way.nodes[i + 1]}`;
        
        const node1Osm = this.osmNodes[way.nodes[i]];
        const node2Osm = this.osmNodes[way.nodes[i + 1]];

        // Ensure both OSM nodes exist and are added to our graph
        if (node1Osm && node2Osm && this.nodes[node1Id] && this.nodes[node2Id]) {
          const point1 = { latitude: node1Osm.lat, longitude: node1Osm.lon };
          const point2 = { latitude: node2Osm.lat, longitude: node2Osm.lon };
          
          const distance = this.calculateDistance(point1, point2);
          
          // Edge weight is distance / speed to represent time (meters / (m/s) = seconds)
          // Speed limit is in km/h, convert to m/s: speedLimit * 1000 / 3600
          const effectiveSpeedMps = speedLimit * 1000 / 3600; // meters per second
          const weight = effectiveSpeedMps > 0 ? distance / effectiveSpeedMps : Infinity; // Time in seconds

          if (isOneWay) {
            this.addEdge(node1Id, node2Id, weight);
          } else {
            this.addEdge(node1Id, node2Id, weight);
            this.addEdge(node2Id, node1Id, weight);
          }
        }
      }
    });

    // Validate graph connectivity after adding all nodes and edges
    await this.validateGraphConnectivity();
  }

  /**
   * Determines the speed limit for a road segment based on OSM tags or default values.
   * @param tags The tags object from an OSM way.
   * @returns The speed limit in km/h.
   */
  private getSpeedLimit(tags: { [key: string]: string | undefined }): number {
    if (tags.maxspeed) {
      const speed = parseInt(tags.maxspeed);
      if (!isNaN(speed) && speed > 0) return speed;
    }

    const roadType = tags.highway;
    return this.DEFAULT_SPEEDS[roadType || 'unclassified'] || this.AVERAGE_SPEED_KMH;
  }

  /**
   * Checks if a street is one-way based on OSM tags and road type.
   * @param tags The tags object from an OSM way.
   * @param roadType The highway tag value.
   * @returns True if the street is one-way, false otherwise.
   */
  private isOneWayStreet(tags: { [key: string]: string | undefined }, roadType: string): boolean {
    return tags.oneway === 'yes' ||
           tags.junction === 'roundabout' ||
           this.ROAD_TYPES.MOTORWAY.includes(roadType);
  }

  /**
   * Adds a node to the graph.
   * @param id The unique ID of the node.
   * @param point The geographical coordinates of the node.
   */
  addNode(id: string, point: Point) {
    if (!this.nodes[id]) {
      this.nodes[id] = {
        id,
        point,
        neighbors: {},
      };
    }
  }

  /**
   * Adds an edge between two nodes. The weight represents the time to traverse.
   * @param node1Id The ID of the first node.
   * @param node2Id The ID of the second node.
   * @param weight The calculated weight (e.g., time in seconds).
   */
  addEdge(node1Id: string, node2Id: string, weight: number) {
    const node1 = this.nodes[node1Id];
    const node2 = this.nodes[node2Id];

    if (!node1 || !node2) {
      // console.warn(`Attempted to add edge between non-existent nodes: ${node1Id} or ${node2Id}`);
      return;
    }
    
    // Only add if the edge doesn't exist or new weight is better (though Dijkstra handles this)
    node1.neighbors[node2Id] = weight;
  }

  /**
   * Validates graph connectivity and removes isolated nodes.
   * This ensures that pathfinding operates on a connected graph.
   */
  private validateGraphConnectivity() {
    if (Object.keys(this.nodes).length === 0) {
      console.warn('Graph is empty, no connectivity to validate.');
      return;
    }

    const visited = new Set<string>();
    const queue: string[] = [];
    const startNodeId = Object.keys(this.nodes)[0];

    if (!startNodeId) { // Handle case where there are no nodes at all (e.g. empty data)
      console.warn('No start node to validate graph connectivity.');
      return;
    }

    // Start a BFS/DFS from an arbitrary node to find all reachable nodes
    queue.push(startNodeId);
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = this.nodes[currentId];

      // It's possible currentNode might be undefined if `startNodeId` was removed by another process
      if (!currentNode) continue; 

      for (const neighborId in currentNode.neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    // Identify and remove isolated nodes (nodes not reachable from the startNodeId)
    const isolatedNodes = Object.keys(this.nodes).filter(id => !visited.has(id));
    isolatedNodes.forEach(id => {
      delete this.nodes[id];
      // Also remove any references to these isolated nodes from other nodes' neighbors
      Object.values(this.nodes).forEach(node => {
        if (node.neighbors[id]) {
          delete node.neighbors[id];
        }
      });
    });

    if (isolatedNodes.length > 0) {
      console.warn(`Removed ${isolatedNodes.length} isolated nodes from the graph.`);
    }

    // Check if the graph is too sparse. Average degree is a rough indicator.
    const totalNodes = Object.keys(this.nodes).length;
    // Calculate total edges correctly (each edge counted once for undirected, twice for directed)
    // Here, we're building a directed graph so sum all neighbor counts
    const totalEdges = Object.values(this.nodes).reduce((sum, node) => sum + Object.keys(node.neighbors).length, 0); 
    const averageDegree = totalNodes > 0 ? totalEdges / totalNodes : 0;

    if (averageDegree < 1.5 && totalNodes > 10) { // Only warn for non-trivial graphs
      console.warn('Graph is too sparse, may not provide good pathfinding results. Average degree:', averageDegree.toFixed(2));
    }
  }

  /**
   * Finds the nearest OSM node to a given point. Prioritizes nodes that are part of a way and have connections.
   * @param point The reference point.
   * @param searchRadius The initial search radius in meters.
   * @returns The ID of the nearest OSM node, or null if none found.
   */
  findNearestOsmNode(point: Point, searchRadius: number = 500): string | null {
    if (!this.isInitialized || Object.keys(this.osmNodes).length === 0) {
      console.warn('PathFinder not initialized or no OSM nodes available for nearest OSM node search.');
      return null;
    }

    let nearestNodeId: string | null = null;
    let minDistance = Infinity;

    // Create a set of graph node IDs that are part of ways for quick lookup
    const graphNodesInWays = new Set<string>();
    Object.values(this.osmWays).forEach(way => {
      way.nodes.forEach(nodeId => {
        graphNodesInWays.add(`osm_${nodeId}`);
      });
    });

    // Iteratively expand search radius if no suitable node is found
    const radii = [searchRadius, searchRadius * 2, searchRadius * 4, Infinity];

    for (const currentRadius of radii) {
      nearestNodeId = null; // Reset for each radius attempt
      minDistance = Infinity;

      for (const osmNodeId in this.osmNodes) {
        const osmNode = this.osmNodes[osmNodeId];
        const graphNodeId = `osm_${osmNodeId}`;
        const nodePoint = { latitude: osmNode.lat, longitude: osmNode.lon };
        const distance = this.calculateDistance(point, nodePoint);

        // Check if within current radius
        if (distance <= currentRadius) {
          // Prioritize nodes that are part of a way and have connections in the graph
          const isConnected = this.getNodeConnections(graphNodeId) > 0;
          const isInWay = graphNodesInWays.has(graphNodeId);

          // We're looking for a connected node that is part of a road way.
          // This makes the assumption that only nodes connected to roads are useful for navigation.
          if (distance < minDistance && isConnected && isInWay) {
            minDistance = distance;
            nearestNodeId = graphNodeId;
          }
        }
      }
      if (nearestNodeId) {
        console.log(`Nearest *connected* node found within ${currentRadius}m: ${nearestNodeId}`);
        return nearestNodeId;
      }
    }

    // If still no node found, this means no *connected* node was found.
    console.warn(`No suitable (connected and in-way) OSM node found near point [${point.latitude}, ${point.longitude}] after multiple radius attempts.`);
    // As a last resort, if no connected node is found, try to find *any* node within graph that's closest.
    // This might lead to paths that start/end in "disconnected" segments, but ensures a result if possible.
    if (!nearestNodeId) {
      console.warn('Attempting to find the absolute nearest graph node regardless of connectivity.');
      minDistance = Infinity;
      for (const graphNodeId in this.nodes) { // Iterate over graph nodes, not just osmNodes
        const graphNode = this.nodes[graphNodeId];
        const distance = this.calculateDistance(point, graphNode.point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestNodeId = graphNodeId;
        }
      }
      if (nearestNodeId) {
        console.warn(`Absolute nearest graph node found: ${nearestNodeId} (may not be connected to main road network)`);
      }
    }
    return nearestNodeId;
  }

  /**
   * Helper method to get the number of connections (neighbors) for a graph node.
   * @param nodeId The ID of the graph node.
   * @returns The number of outgoing connections from the node.
   */
  private getNodeConnections(nodeId: string): number {
    const node = this.nodes[nodeId];
    return node ? Object.keys(node.neighbors).length : 0;
  }

  /**
   * Finds the shortest path between two nodes using Dijkstra's algorithm.
   * The 'weight' of edges is time in seconds, so it finds the fastest path.
   * @param startId The ID of the starting node.
   * @param endId The ID of the ending node.
   * @returns A PathResult object if a path is found, otherwise null.
   */
  findShortestPath(startId: string, endId: string): PathResult | null {
    if (!this.isInitialized) {
      console.error('PathFinder not initialized. Call fetchRoadNetwork first.');
      return null;
    }
    if (!this.nodes[startId] || !this.nodes[endId]) {
      console.error('Start or end node not found in graph:', { startId, endId });
      return null;
    }

    const distances: { [key: string]: number } = {}; // Stores shortest time from start to node
    const previous: { [key: string]: string | null } = {}; // Stores previous node in shortest path
    
    // Priority queue to efficiently get the node with the smallest distance
    // Stores [distance, nodeId] tuples, ordered by distance
    const priorityQueue = new this.PriorityQueue<[number, string]>((a, b) => a[0] - b[0]);

    // Initialize distances and previous nodes
    for (const nodeId in this.nodes) {
      distances[nodeId] = Infinity;
      previous[nodeId] = null;
    }
    distances[startId] = 0;
    priorityQueue.enqueue([0, startId]);

    let nodesProcessed = 0;

    while (!priorityQueue.isEmpty()) {
      const [currentDistance, currentId] = priorityQueue.dequeue()!;

      // Optimization: if we've already found a shorter path to currentId, skip
      if (currentDistance > distances[currentId]) {
        continue;
      }

      nodesProcessed++;
      if (nodesProcessed % 1000 === 0) {
        console.log(`Dijkstra: Processed ${nodesProcessed} nodes, current node: ${currentId}`);
      }

      // If we reached the end node, reconstruct the path
      if (currentId === endId) {
        const path = this.reconstructPath(previous, endId);
        
        // Use detailed path coordinates for accurate distance and time calculation
        const detailedPathCoords = this.getDetailedPathCoordinates(path);
        const totalDistanceMeters = this.calculatePathDistance(detailedPathCoords); // meters
        const totalEstimatedTimeSeconds = this.calculateEstimatedTime(detailedPathCoords); // seconds

        // Convert to kilometers and minutes for PathResult
        const totalDistanceKm = totalDistanceMeters / 1000;
        const totalEstimatedTimeMinutes = totalEstimatedTimeSeconds / 60;

        const fare = this.calculateFare(totalDistanceKm);

        console.log(`Path found from ${startId} to ${endId}. Distance: ${totalDistanceKm.toFixed(2)} km, Estimated Time: ${totalEstimatedTimeMinutes.toFixed(2)} mins, Fare: ₱${fare.toFixed(2)}`);
        return { 
          path, 
          distance: totalDistanceKm, 
          estimatedTime: totalEstimatedTimeMinutes, 
          fare 
        };
      }

      const currentNode = this.nodes[currentId];
      // It's possible `currentNode` could be undefined if it was an isolated node removed by validation
      if (!currentNode) continue;

      for (const neighborId in currentNode.neighbors) {
        const weight = currentNode.neighbors[neighborId];
        const newDistance = distances[currentId] + weight;

        if (newDistance < distances[neighborId]) {
          distances[neighborId] = newDistance;
          previous[neighborId] = currentId;
          priorityQueue.enqueue([newDistance, neighborId]);
        }
      }
    }

    console.warn('No path found between nodes:', startId, 'to', endId);
    return null;
  }

  /**
   * Reconstructs the path from the `previous` map generated by Dijkstra's algorithm.
   * @param cameFrom A map where keys are node IDs and values are the ID of the preceding node in the shortest path.
   * @param currentId The ID of the destination node.
   * @returns An array of node IDs representing the shortest path.
   */
  private reconstructPath(cameFrom: { [key: string]: string | null }, currentId: string): string[] {
    const path: string[] = [];
    let current: string | null = currentId;
    while (current !== null) {
      path.unshift(current);
      current = cameFrom[current];
    }
    return path;
  }

  /**
   * Calculates the fare based on the total distance.
   * @param distance The total distance in kilometers.
   * @returns The calculated fare in local currency.
   */
  private calculateFare(distance: number): number {
    if (distance <= this.BASE_KM) {
      return this.BASE_FARE;
    } else {
      return this.BASE_FARE + (distance - this.BASE_KM) * this.RATE_PER_KM;
    }
  }

  /**
   * Retrieves the geographical coordinates for a given path.
   * @param path An array of node IDs representing the path.
   * @returns An array of Point objects representing the coordinates of each node in the path.
   */
  getPathCoordinates(path: string[]): Point[] {
    return path
      .map((nodeId) => this.nodes[nodeId]?.point)
      .filter((point) => point !== undefined) as Point[];
  }

  /**
   * Gets detailed path coordinates by including intermediate points from OSM ways.
   * This is useful for rendering a smooth, realistic route on a map.
   * @param path An array of node IDs from the calculated shortest path.
   * @returns An array of Point objects representing the detailed path.
   */
  public getDetailedPathCoordinates(path: string[]): Point[] {
    const detailedPath: Point[] = [];
    
    if (path.length === 0) return detailedPath;

    for (let i = 0; i < path.length - 1; i++) {
      const currentId = path[i];
      const nextId = path[i + 1];
      
      const currentNode = this.nodes[currentId];
      const nextNode = this.nodes[nextId];

      if (!currentNode || !nextNode) {
        console.warn(`Missing node in path details: ${currentId} or ${nextId}`);
        continue;
      }

      // Add the current point
      detailedPath.push(currentNode.point);
      
      // Find the OSM way that connects these two graph nodes
      // This is crucial for getting all intermediate points along a road segment
      const connectingWay = this.findConnectingWay(currentId, nextId);
      if (connectingWay) {
        const intermediatePoints = this.getIntermediatePoints(connectingWay, currentId, nextId);
        detailedPath.push(...intermediatePoints);
      }
    }
    
    // Add the final point of the last segment
    if (path.length > 0) {
      const lastNode = this.nodes[path[path.length - 1]];
      if (lastNode) {
        detailedPath.push(lastNode.point);
      }
    }
    
    // Optional: Smooth the path further (e.g., remove redundant collinear points)
    // return this.smoothPath(detailedPath); 
    return detailedPath;
  }

  /**
   * Finds the OSM way that connects two given graph nodes.
   * It looks for a way that contains both the start and end OSM nodes.
   * @param node1Id The ID of the first graph node (e.g., 'osm_123').
   * @param node2Id The ID of the second graph node.
   * @returns The OSMWay object if found, otherwise null.
   */
  private findConnectingWay(node1Id: string, node2Id: string): OSMWay | null {
    // Extract OSM node IDs from graph node IDs
    const osmId1 = parseInt(node1Id.replace('osm_', ''));
    const osmId2 = parseInt(node2Id.replace('osm_', ''));

    if (isNaN(osmId1) || isNaN(osmId2)) return null;

    // Check if the graph nodes exist to get their points
    const graphNode1 = this.nodes[node1Id];
    const graphNode2 = this.nodes[node2Id];

    if (!graphNode1 || !graphNode2) return null;

    for (const way of Object.values(this.osmWays)) {
      // Check if both OSM node IDs are present in the way's nodes array
      const node1Index = way.nodes.indexOf(osmId1);
      const node2Index = way.nodes.indexOf(osmId2);

      // We need them to be sequential or reverse sequential to be a direct segment
      if (node1Index !== -1 && node2Index !== -1 && Math.abs(node1Index - node2Index) === 1) {
        return way;
      }
    }
    return null;
  }

  /**
   * Extracts intermediate geographical points from an OSM way between two specified nodes.
   * @param way The OSMWay object.
   * @param startNodeId The graph ID of the starting node of the segment.
   * @param endNodeId The graph ID of the ending node of the segment.
   * @returns An array of Point objects representing the intermediate points.
   */
  private getIntermediatePoints(way: OSMWay, startNodeId: string, endNodeId: string): Point[] {
    const points: Point[] = [];
    
    const osmStartId = parseInt(startNodeId.replace('osm_', ''));
    const osmEndId = parseInt(endNodeId.replace('osm_', ''));

    const startIndex = way.nodes.indexOf(osmStartId);
    const endIndex = way.nodes.indexOf(osmEndId);
    
    if (startIndex === -1 || endIndex === -1) {
        // This should ideally not happen if findConnectingWay is accurate
        console.warn(`Start or end OSM node not found in way nodes: Way ID ${way.id}, Start: ${osmStartId}, End: ${osmEndId}`);
        return points;
    }
    
    // Add intermediate points in the correct order (forward or backward)
    const step = startIndex < endIndex ? 1 : -1;
    for (let i = startIndex + step; i !== endIndex; i += step) {
        const osmNode = this.osmNodes[way.nodes[i]];
        if (osmNode) {
            points.push({
                latitude: osmNode.lat,
                longitude: osmNode.lon
            });
        }
    }
    
    return points;
  }

  /**
   * Calculates the total distance of a path defined by a series of geographical points.
   * @param points An array of Point objects.
   * @returns The total distance in meters.
   */
  private calculatePathDistance(points: Point[]): number {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calculateDistance(points[i], points[i + 1]);
    }
    return totalDistance;
  }

  /**
   * Calculates the estimated time to traverse a path defined by a series of geographical points.
   * It estimates time based on road types and their default speeds.
   * @param points An array of Point objects.
   * @returns The total estimated time in seconds.
   */
  private calculateEstimatedTime(points: Point[]): number {
    let totalTimeSeconds = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const distanceMeters = this.calculateDistance(points[i], points[i + 1]);
      
      // Attempt to find the road type for this segment
      // This is an approximation as a direct line between points might span multiple ways
      const roadType = this.findRoadTypeBetweenPoints(points[i], points[i + 1]);
      const speedLimitKmH = this.DEFAULT_SPEEDS[roadType] || this.AVERAGE_SPEED_KMH;
      
      const speedLimitMps = speedLimitKmH * 1000 / 3600; // meters per second
      
      if (speedLimitMps > 0) {
        totalTimeSeconds += distanceMeters / speedLimitMps;
      } else {
        totalTimeSeconds += Infinity; // Effectively an impassable segment
      }
    }
    return totalTimeSeconds;
  }

  /**
   * Finds the road type for a segment defined by two points.
   * This is a heuristic and might not be perfectly accurate if points are not directly on a single way.
   * It prioritizes ways that contain both points.
   * @param point1 The first point.
   * @param point2 The second point.
   * @returns The highway tag of the road type, or 'unclassified' if not found.
   */
  private findRoadTypeBetweenPoints(point1: Point, point2: Point): string {
    // A small epsilon for floating point comparison of coordinates
    const EPSILON = 0.00001; 

    for (const way of Object.values(this.osmWays)) {
      if (!way.tags.highway) continue;

      // Check if both points correspond to nodes within this way
      let foundPoint1InWay = false;
      let foundPoint2InWay = false;

      for (const nodeId of way.nodes) {
        const osmNode = this.osmNodes[nodeId];
        if (osmNode) {
          if (Math.abs(osmNode.lat - point1.latitude) < EPSILON && Math.abs(osmNode.lon - point1.longitude) < EPSILON) {
            foundPoint1InWay = true;
          }
          if (Math.abs(osmNode.lat - point2.latitude) < EPSILON && Math.abs(osmNode.lon - point2.longitude) < EPSILON) {
            foundPoint2InWay = true;
          }
        }
        if (foundPoint1InWay && foundPoint2InWay) {
          return way.tags.highway;
        }
      }
    }
    return 'unclassified';
  }

  // --- Path Smoothing and Heuristic (Currently not used in findShortestPath) ---
  // These methods are present in the original code but not integrated into Dijkstra's for this example.
  // They would be relevant for A* or post-processing for rendering.

  /**
   * Optimized heuristic function for A* algorithm (Manhattan distance).
   * Not directly used in the current Dijkstra's implementation but useful for A*.
   * @param point1 The first point.
   * @param point2 The second point.
   * @returns An estimated "cost" between the points.
   */
  private heuristic(point1: Point, point2: Point): number {
    // This is a simple Manhattan distance on lat/lon, which is very fast but less accurate than Haversine.
    // For A*, a more accurate heuristic like Haversine distance (converted to time) would be better.
    const dx = Math.abs(point2.longitude - point1.longitude);
    const dy = Math.abs(point2.latitude - point1.latitude);
    return dx + dy;
  }

  /**
   * Path smoothing function. This is a post-processing step to simplify the path for rendering.
   * Currently uses a simplified "line-of-sight" check.
   * @param path The array of points representing the detailed path.
   * @returns A simplified array of points.
   */
  private smoothPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;

    const smoothed: Point[] = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      let furthestVisible = currentIndex + 1;
      
      // Look ahead to find the furthest point that has a "direct line of sight"
      // This is a simplified check, a real one would involve checking for obstacles/roads between points.
      for (let i = currentIndex + 2; i < path.length; i++) {
        // A simple check could be if they are on the same road segment and close enough
        // Or if there are no major turns/intersections between them
        if (this.isLineOfSight(path[currentIndex], path[i])) {
          furthestVisible = i;
        }
      }

      smoothed.push(path[furthestVisible]);
      currentIndex = furthestVisible;
    }

    return smoothed;
  }

  /**
   * Placeholder for a line-of-sight check.
   * In a real-world scenario, this would involve checking for geometric obstructions
   * or if the segment between points is a continuous part of a single road.
   * @param point1 The first point.
   * @param point2 The second point.
   * @returns True if a direct line of sight is considered to exist, false otherwise.
   */
  private isLineOfSight(point1: Point, point2: Point): boolean {
    // This is a very simplistic check. A true "line of sight" for road networks
    // would mean checking if the two points lie on the same continuous road segment
    // without any intersections or significant turns in between.
    // For now, a short distance check and being on a similar road type could be a proxy.

    const distance = this.calculateDistance(point1, point2);
    // If points are very close, consider them in line of sight for smoothing purposes.
    if (distance < 50) return true; // 50 meters

    // More complex: check if they belong to the same 'way' in OSM.
    // This requires iterating through OSM ways and checking if both points' corresponding OSM nodes are sequential in any way.
    // This is computationally intensive for real-time smoothing and might be better handled by a different algorithm.
    // For simplicity, we'll keep it basic for now.
    return false; // By default, assume no direct line of sight for larger distances unless proven otherwise.
  }

  /**
   * Validates a reconstructed path.
   * @param path An array of node IDs.
   * @returns True if the path is valid (nodes exist, connected), false otherwise.
   */
  private validatePath(path: string[]): boolean {
    if (path.length < 2) return false;

    for (const nodeId of path) {
      if (!this.nodes[nodeId]) {
        console.error(`Invalid node in path: ${nodeId}`);
        return false;
      }
    }

    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = this.nodes[path[i]];
      if (!currentNode || !currentNode.neighbors[path[i + 1]]) {
        console.error(`Path not connected between nodes ${path[i]} and ${path[i + 1]}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Simple Priority Queue implementation for Dijkstra's algorithm.
   * Stores elements as tuples [priority, value], ordered by priority.
   */
  private PriorityQueue = class<T> {
    private items: [number, T][] = [];
    private compare: (a: [number, T], b: [number, T]) => number;

    constructor(compare: (a: [number, T], b: [number, T]) => number) {
      this.compare = compare;
    }

    enqueue(item: [number, T]): void {
      this.items.push(item);
      this.items.sort(this.compare); // Simple sort, not optimized for large queues
    }

    dequeue(): [number, T] | undefined {
      return this.items.shift();
    }

    isEmpty(): boolean {
      return this.items.length === 0;
    }

    size(): number {
      return this.items.length;
    }
  };

  // --- Public Getters for Debugging/External Access (Use with caution) ---

  /**
   * Gets the internal graph nodes.
   * @returns An object containing all GraphNode objects.
   */
  public getNodes() {
    return this.nodes;
  }

  /**
   * Gets the internal OSM nodes.
   * @returns An object containing all OSMNode objects.
   */
  public getOsmNodes() {
    return this.osmNodes;
  }

  /**
   * Gets the internal OSM ways.
   * @returns An object containing all OSMWay objects.
   */
  public getOsmWays() {
    return this.osmWays;
  }
}

export { PathFinder, Point, GraphNode, PathResult };

// --- Example Usage (for Node.js) ---
// To run this example, save the code as a .ts file (e.g., pathfinder.ts),
// ensure you have TypeScript installed (`npm install -g typescript`),
// and `node-fetch` if running in Node.js (`npm install node-fetch`).
// Then compile and run: `tsc pathfinder.ts && node pathfinder.js`

async function main() {
  // To simulate Node.js environment, uncomment these lines.
  // For browser, 'fetch' is globally available.
  /*
  const fetch = await import('node-fetch');
  (global as any).fetch = fetch.default;
  */

  const pathFinder = new PathFinder();

  // Naga City, Philippines - Example center point
  const nagaCityCenter: Point = {
    latitude: 13.6200,
    longitude: 123.1800,
  };
  const searchRadius = 5000; // 5 km radius

  try {
    console.log('Initializing PathFinder by fetching road network...');
    await pathFinder.fetchRoadNetwork(nagaCityCenter, searchRadius);
    console.log('PathFinder initialized successfully.');

    // Example start and end points (near Naga City)
    // Point A: Near Naga City Public Market
    const startPoint: Point = { latitude: 13.6186, longitude: 123.1852 }; 
    // Point B: Near SM City Naga
    const endPoint: Point = { latitude: 13.6305, longitude: 123.1758 };

    console.log('\nFinding nearest OSM nodes for start and end points...');
    const startNodeId = pathFinder.findNearestOsmNode(startPoint, 500); // Search within 500m
    const endNodeId = pathFinder.findNearestOsmNode(endPoint, 500);

    if (startNodeId && endNodeId) {
      console.log(`Nearest start node: ${startNodeId}`);
      console.log(`Nearest end node: ${endNodeId}`);

      console.log('\nFinding shortest path...');
      const pathResult = pathFinder.findShortestPath(startNodeId, endNodeId);

      if (pathResult) {
        console.log('\n--- Path Result ---');
        console.log('Path (node IDs):', pathResult.path.join(' -> '));
        console.log(`Total Distance: ${pathResult.distance.toFixed(2)} km`);
        console.log(`Estimated Time: ${pathResult.estimatedTime.toFixed(2)} minutes`);
        console.log(`Estimated Fare: ₱${pathResult.fare.toFixed(2)}`);

        // Get detailed coordinates for mapping
        const detailedCoords = pathFinder.getDetailedPathCoordinates(pathResult.path);
        console(`\nDetailed Path Coordinates (first 5 and last 5):`);
        if (detailedCoords.length > 10) {
          console.log(detailedCoords.slice(0, 5));
          console.log('...');
          console.log(detailedCoords.slice(-5));
        } else {
          console.log(detailedCoords);
        }
        console.log(`Total detailed coordinates: ${detailedCoords.length}`);
      } else {
        console.log('Could not find a path between the specified points.');
      }
    } else {
      console.error('Could not find suitable start or end nodes on the map. Try adjusting coordinates or search radius.');
    }

  } catch (error) {
    console.error('\nAn error occurred during pathfinding process:', error);
  }
}

// Call the main function to run the example
// main();