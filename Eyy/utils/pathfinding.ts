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
  private readonly AVERAGE_SPEED_KMH = 40;

  // Add these constants at the top of the PathFinder class
  private readonly ROAD_TYPES = {
    MOTORWAY: ['motorway', 'motorway_link'],
    TRUNK: ['trunk', 'trunk_link'],
    PRIMARY: ['primary', 'primary_link'],
    SECONDARY: ['secondary', 'secondary_link'],
    TERTIARY: ['tertiary', 'tertiary_link'],
    RESIDENTIAL: ['residential', 'unclassified', 'living_street'],
    SERVICE: ['service']
  };

  private readonly DEFAULT_SPEEDS = {
    motorway: 100,
    trunk: 80,
    primary: 60,
    secondary: 50,
    tertiary: 40,
    residential: 30,
    service: 20
  };

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

  // Enhanced fetchRoadNetwork with retry logic and caching
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
        
        // Clear existing data
        this.nodes = {};
        this.osmNodes = {};
        this.osmWays = {};
        this.isInitialized = false;

        // Optimized Overpass API query
        const query = `
          [out:json][timeout:25];
          (
            way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service)$"](around:${radius},${center.latitude},${center.longitude});
            node(w);
            >;
          );
          out body;
        `;

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

  // New method to process OSM data
  private async processOSMData(data: any): Promise<void> {
    try {
      // Process nodes and ways separately first
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

      console.log('Processed OSM data', {
        osmNodes: Object.keys(this.osmNodes).length,
        osmWays: Object.keys(this.osmWays).length
      });

      // Build graph from OSM data
      await this.buildGraphFromOSM();
      this.isInitialized = true;
      console.log('PathFinder initialized with graph', {
        nodes: Object.keys(this.nodes).length
      });
    } catch (error) {
      console.error('Error processing OSM data:', error);
      throw error;
    }
  }

  // New method to validate road ways
  private isValidRoadWay(way: any): boolean {
    if (!way.tags?.highway || !way.nodes || way.nodes.length < 2) {
      return false;
    }

    const roadType = way.tags.highway;
    const validRoadTypes = [
      'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
      'residential', 'unclassified', 'service'
    ];

    return validRoadTypes.includes(roadType);
  }

  // Enhanced buildGraphFromOSM with better validation
  private async buildGraphFromOSM(): Promise<void> {
    // Add OSM nodes to graph
    Object.values(this.osmNodes).forEach((osmNode) => {
      this.addNode(`osm_${osmNode.id}`, {
        latitude: osmNode.lat,
        longitude: osmNode.lon,
      });
    });

    // Add edges from ways with enhanced validation
    Object.values(this.osmWays).forEach((way) => {
      const roadType = way.tags.highway;
      if (!roadType) return;

      // Get speed limit from tags or use default based on road type
      const speedLimit = this.getSpeedLimit(way.tags);
      const isOneWay = this.isOneWayStreet(way.tags, roadType);

      // Add edges between consecutive nodes
      for (let i = 0; i < way.nodes.length - 1; i++) {
        const node1Id = `osm_${way.nodes[i]}`;
        const node2Id = `osm_${way.nodes[i + 1]}`;
        
        if (this.nodes[node1Id] && this.nodes[node2Id]) {
          const node1 = this.nodes[node1Id];
          const node2 = this.nodes[node2Id];
          const distance = this.calculateDistance(node1.point, node2.point);
          
          if (isOneWay) {
            this.addEdge(node1Id, node2Id, distance, speedLimit);
          } else {
            this.addEdge(node1Id, node2Id, distance, speedLimit);
            this.addEdge(node2Id, node1Id, distance, speedLimit);
          }
        }
      }
    });

    // Validate graph connectivity
    await this.validateGraphConnectivity();
  }

  // New method to get speed limit
  private getSpeedLimit(tags: any): number {
    if (tags.maxspeed) {
      const speed = parseInt(tags.maxspeed);
      if (!isNaN(speed)) return speed;
    }

    const roadType = tags.highway;
    return this.DEFAULT_SPEEDS[roadType as keyof typeof this.DEFAULT_SPEEDS] || 30;
  }

  // New method to check if a street is one-way
  private isOneWayStreet(tags: any, roadType: string): boolean {
    return tags.oneway === 'yes' ||
           tags.junction === 'roundabout' ||
           this.ROAD_TYPES.MOTORWAY.includes(roadType);
  }

  // Add a node to the graph
  addNode(id: string, point: Point) {
    this.nodes[id] = {
      id,
      point,
      neighbors: {},
    };
  }

  // Add an edge between two nodes with optional distance and speed limit
  addEdge(node1Id: string, node2Id: string, distance?: number, speedLimit?: number) {
    const node1 = this.nodes[node1Id];
    const node2 = this.nodes[node2Id];

    if (!node1 || !node2) {
      return; // Silently fail if nodes don't exist
    }

    // Use provided distance or calculate it
    const edgeDistance = distance ?? this.calculateDistance(node1.point, node2.point);
    
    // Calculate edge weight based on distance and speed limit
    const edgeWeight = speedLimit ? 
      (edgeDistance / 1000) / (speedLimit / 60) : // Convert to time in minutes
      edgeDistance;
    
    // Add edge with calculated weight
    node1.neighbors[node2Id] = edgeWeight;
  }

  // Validate graph connectivity
  private validateGraphConnectivity() {
    const visited = new Set<string>();
    const queue: string[] = [];
    const startNode = Object.keys(this.nodes)[0];

    if (!startNode) return;

    queue.push(startNode);
    visited.add(startNode);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = this.nodes[currentId];

      for (const neighborId in currentNode.neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    // Remove isolated nodes
    const isolatedNodes = Object.keys(this.nodes).filter(id => !visited.has(id));
    isolatedNodes.forEach(id => {
      delete this.nodes[id];
    });

    if (isolatedNodes.length > 0) {
      console.warn(`Removed ${isolatedNodes.length} isolated nodes from the graph`);
    }

    // Check if graph is too sparse
    const totalNodes = Object.keys(this.nodes).length;
    const totalEdges = Object.values(this.nodes).reduce((sum, node) => sum + Object.keys(node.neighbors).length, 0) / 2;
    const averageDegree = totalEdges / totalNodes;

    if (averageDegree < 1.5) {
      console.warn('Graph is too sparse, may not provide good pathfinding results');
    }
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

      // Check if node is part of a way and within search radius
      if (distance <= searchRadius && nodesInWays.has(`osm_${osmNodeId}`)) {
        // Additional validation: Check if the node has at least one connection
        const nodeConnections = this.getNodeConnections(`osm_${osmNodeId}`);
        if (nodeConnections > 0 && distance < minDistance) {
          minDistance = distance;
          nearestNodeId = `osm_${osmNodeId}`;
        }
      }
    }

    // Second attempt: If no node found in ways, try any node within an expanded radius
    if (!nearestNodeId) {
      const expandedRadius = searchRadius * 2;
      for (const osmNodeId in this.osmNodes) {
        const osmNode = this.osmNodes[osmNodeId];
        const nodePoint = { latitude: osmNode.lat, longitude: osmNode.lon };
        const distance = this.calculateDistance(point, nodePoint);

        if (distance <= expandedRadius) {
          const nodeConnections = this.getNodeConnections(`osm_${osmNodeId}`);
          if (nodeConnections > 0 && distance < minDistance) {
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
          const nodeConnections = this.getNodeConnections(`osm_${osmNodeId}`);
          if (nodeConnections > 0) {
            minDistance = distance;
            nearestNodeId = `osm_${osmNodeId}`;
          }
        }
      }
    }

    return nearestNodeId;
  }

  // Helper method to get number of connections for a node
  private getNodeConnections(nodeId: string): number {
    const node = this.nodes[nodeId];
    return node ? Object.keys(node.neighbors).length : 0;
  }

  // Enhanced path finding with better road network handling
  findShortestPath(startId: string, endId: string): PathResult | null {
    if (!this.nodes[startId] || !this.nodes[endId]) {
      console.error('Start or end node not found in graph');
      return null;
    }

    const startNode = this.nodes[startId];
    const endNode = this.nodes[endId];
    const openSet = new Set<string>([startId]);
    const closedSet = new Set<string>();
    const cameFrom: { [key: string]: string } = {};
    const gScore: { [key: string]: number } = { [startId]: 0 };
    const fScore: { [key: string]: number } = { [startId]: this.heuristic(startNode.point, endNode.point) };
    
    // Use a more efficient priority queue implementation
    const priorityQueue = new this.PriorityQueue<string>((a: string, b: string) => fScore[a] - fScore[b]);
    priorityQueue.enqueue(startId);

    // Cache for heuristic values
    const heuristicCache: { [key: string]: number } = {};

    while (!priorityQueue.isEmpty()) {
      const currentId = priorityQueue.dequeue()!;
      
      if (currentId === endId) {
        const path = this.reconstructPath(cameFrom, currentId);
        if (this.validatePath(path)) {
          // Get detailed path coordinates including intermediate points
          const detailedPath = this.getDetailedPathCoordinates(path);
          const distance = this.calculatePathDistance(detailedPath);
          const estimatedTime = this.calculateEstimatedTime(detailedPath);
          const fare = this.calculateFare(distance);
          return { 
            path, 
            distance, 
            estimatedTime, 
            fare 
          };
        }
        return null;
      }

      openSet.delete(currentId);
      closedSet.add(currentId);

      const currentNode = this.nodes[currentId];
      for (const neighborId in currentNode.neighbors) {
        if (closedSet.has(neighborId)) continue;

        const tentativeGScore = gScore[currentId] + currentNode.neighbors[neighborId];

        if (!openSet.has(neighborId)) {
          openSet.add(neighborId);
        } else if (tentativeGScore >= (gScore[neighborId] || Infinity)) {
          continue;
        }

        cameFrom[neighborId] = currentId;
        gScore[neighborId] = tentativeGScore;

        // Use cached heuristic value if available
        const cacheKey = `${neighborId}-${endId}`;
        if (!heuristicCache[cacheKey]) {
          heuristicCache[cacheKey] = this.heuristic(this.nodes[neighborId].point, endNode.point);
        }
        fScore[neighborId] = tentativeGScore + heuristicCache[cacheKey];
        
        priorityQueue.enqueue(neighborId);
      }
    }

    console.warn('No path found between nodes');
    return null;
  }

  // Get detailed path coordinates including intermediate points
  public getDetailedPathCoordinates(path: string[]): Point[] {
    const detailedPath: Point[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const currentId = path[i];
      const nextId = path[i + 1];
      
      // Add current point
      detailedPath.push(this.nodes[currentId].point);
      
      // Find the OSM way that connects these nodes
      const way = this.findConnectingWay(currentId, nextId);
      if (way) {
        // Add intermediate points from the way
        const intermediatePoints = this.getIntermediatePoints(way, currentId, nextId);
        detailedPath.push(...intermediatePoints);
      }
    }
    
    // Add the final point
    if (path.length > 0) {
      detailedPath.push(this.nodes[path[path.length - 1]].point);
    }
    
    return detailedPath;
  }

  // Find the OSM way that connects two nodes
  private findConnectingWay(node1Id: string, node2Id: string): OSMWay | null {
    const node1 = this.nodes[node1Id];
    const node2 = this.nodes[node2Id];
    
    for (const way of Object.values(this.osmWays)) {
      const nodes = way.nodes.map(id => this.osmNodes[id]);
      if (nodes.length < 2) continue;

      // Check if both nodes are part of this way
      const containsNode1 = nodes.some(node => 
        Math.abs(node.lat - node1.point.latitude) < 0.0001 && 
        Math.abs(node.lon - node1.point.longitude) < 0.0001
      );
      const containsNode2 = nodes.some(node => 
        Math.abs(node.lat - node2.point.latitude) < 0.0001 && 
        Math.abs(node.lon - node2.point.longitude) < 0.0001
      );

      if (containsNode1 && containsNode2) {
        return way;
      }
    }
    
    return null;
  }

  // Get intermediate points between two nodes in a way
  private getIntermediatePoints(way: OSMWay, startNodeId: string, endNodeId: string): Point[] {
    const points: Point[] = [];
    const nodes = way.nodes.map(id => this.osmNodes[id]);
    
    // Find the indices of start and end nodes
    const startIndex = nodes.findIndex(node => 
      Math.abs(node.lat - this.nodes[startNodeId].point.latitude) < 0.0001 && 
      Math.abs(node.lon - this.nodes[startNodeId].point.longitude) < 0.0001
    );
    const endIndex = nodes.findIndex(node => 
      Math.abs(node.lat - this.nodes[endNodeId].point.latitude) < 0.0001 && 
      Math.abs(node.lon - this.nodes[endNodeId].point.longitude) < 0.0001
    );
    
    if (startIndex === -1 || endIndex === -1) return points;
    
    // Add intermediate points in the correct order
    const step = startIndex < endIndex ? 1 : -1;
    for (let i = startIndex + step; i !== endIndex; i += step) {
      points.push({
        latitude: nodes[i].lat,
        longitude: nodes[i].lon
      });
    }
    
    return points;
  }

  // Optimized heuristic function
  private heuristic(point1: Point, point2: Point): number {
    const dx = point2.longitude - point1.longitude;
    const dy = point2.latitude - point1.latitude;
    // Use Manhattan distance for faster calculation
    return Math.abs(dx) + Math.abs(dy);
  }

  // Enhanced path smoothing
  private smoothPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;

    const smoothed: Point[] = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      let furthestVisible = currentIndex + 1;
      
      // Look ahead to find the furthest visible point
      for (let i = currentIndex + 2; i < path.length; i++) {
        if (this.isLineOfSight(path[currentIndex], path[i])) {
          furthestVisible = i;
        }
      }

      smoothed.push(path[furthestVisible]);
      currentIndex = furthestVisible;
    }

    return smoothed;
  }

  // Check if there's a direct line of sight between two points
  private isLineOfSight(point1: Point, point2: Point): boolean {
    // Check if the points are on the same road
    const roadType = this.findRoadTypeBetweenPoints(point1, point2);
    if (roadType === 'unclassified') return false;

    // Check if the distance is reasonable (e.g., less than 100 meters)
    const distance = this.calculateDistance(point1, point2);
    return distance < 100;
  }

  // New method to get road type weight for better path finding
  private getRoadTypeWeight(point1: Point, point2: Point): number {
    // Find the road type between these points
    const roadType = this.findRoadTypeBetweenPoints(point1, point2);
    
    // Weight factors for different road types (lower is better)
    const weights: { [key: string]: number } = {
      motorway: 0.8,
      trunk: 0.85,
      primary: 0.9,
      secondary: 0.95,
      tertiary: 1.0,
      residential: 1.1,
      unclassified: 1.2,
      service: 1.3
    };

    return weights[roadType] || 1.0;
  }

  // New method to find road type between two points
  private findRoadTypeBetweenPoints(point1: Point, point2: Point): string {
    // Find the OSM way that contains these points
    for (const way of Object.values(this.osmWays)) {
      const nodes = way.nodes.map(id => this.osmNodes[id]);
      if (nodes.length < 2) continue;

      // Check if these points are part of this way
      const containsPoint1 = nodes.some(node => 
        Math.abs(node.lat - point1.latitude) < 0.0001 && 
        Math.abs(node.lon - point1.longitude) < 0.0001
      );
      const containsPoint2 = nodes.some(node => 
        Math.abs(node.lat - point2.latitude) < 0.0001 && 
        Math.abs(node.lon - point2.longitude) < 0.0001
      );

      if (containsPoint1 && containsPoint2) {
        return way.tags.highway || 'unclassified';
      }
    }

    return 'unclassified';
  }

  // Enhanced path validation
  private validatePath(path: string[]): boolean {
    if (path.length < 2) return false;

    // Check if all nodes in path exist
    for (const nodeId of path) {
      if (!this.nodes[nodeId]) {
        console.error(`Invalid node in path: ${nodeId}`);
        return false;
      }
    }

    // Check if path is connected
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = this.nodes[path[i]];
      const nextNode = this.nodes[path[i + 1]];
      
      if (!currentNode.neighbors[path[i + 1]]) {
        console.error(`Path not connected between nodes ${path[i]} and ${path[i + 1]}`);
        return false;
      }
    }

    return true;
  }

  // Calculate path distance using detailed coordinates
  private calculatePathDistance(points: Point[]): number {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calculateDistance(points[i], points[i + 1]);
    }
    return totalDistance;
  }

  // Calculate estimated time using detailed coordinates
  private calculateEstimatedTime(points: Point[]): number {
    let totalTime = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const distance = this.calculateDistance(points[i], points[i + 1]);
      const roadType = this.findRoadTypeBetweenPoints(points[i], points[i + 1]);
      const speedLimit = this.DEFAULT_SPEEDS[roadType as keyof typeof this.DEFAULT_SPEEDS] || 30;
      
      // Convert distance to kilometers and speed to km/h
      const distanceKm = distance / 1000;
      totalTime += (distanceKm / speedLimit) * 60; // Time in minutes
    }
    return totalTime;
  }

  // Priority Queue implementation for A* algorithm
  private PriorityQueue = class<T> {
    private items: T[] = [];
    private compare: (a: T, b: T) => number;

    constructor(compare: (a: T, b: T) => number) {
      this.compare = compare;
    }

    enqueue(item: T): void {
      this.items.push(item);
      this.items.sort(this.compare);
    }

    dequeue(): T | undefined {
      return this.items.shift();
    }

    isEmpty(): boolean {
      return this.items.length === 0;
    }
  };

  // Reconstruct path from cameFrom map
  private reconstructPath(cameFrom: { [key: string]: string }, currentId: string): string[] {
    const path: string[] = [];
    let current = currentId;
    while (current !== null) {
      path.unshift(current);
      current = cameFrom[current];
    }
    return path;
  }

  // Calculate fare based on distance
  private calculateFare(distance: number): number {
    if (distance <= this.BASE_KM) {
      return this.BASE_FARE;
    } else {
      return this.BASE_FARE + (distance - this.BASE_KM) * this.RATE_PER_KM;
    }
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

export { PathFinder, Point, GraphNode, PathResult }; 