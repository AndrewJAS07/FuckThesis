interface Graph {
  [key: string]: { [key: string]: number };
}

interface ShortestPaths {
  distance: number;
  path: string[];
}

export function dijkstra(graph: Graph, startNode: string, endNode: string): ShortestPaths {
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const priorityQueue: { node: string; distance: number }[] = [];

  // Initialize distances
  for (const node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[startNode] = 0;

  // Add startNode to the priority queue
  priorityQueue.push({ node: startNode, distance: 0 });

  while (priorityQueue.length > 0) {
    // Sort the priority queue by distance and get the node with the smallest distance
    priorityQueue.sort((a, b) => a.distance - b.distance);
    const { node: currentNode } = priorityQueue.shift()!;

    if (currentNode === endNode) break;

    // Update distances to neighbors
    for (const neighbor in graph[currentNode]) {
      const distance = distances[currentNode] + graph[currentNode][neighbor];
      if (distance < distances[neighbor]) {
        distances[neighbor] = distance;
        previous[neighbor] = currentNode;

        // Add neighbor to the priority queue
        priorityQueue.push({ node: neighbor, distance });
      }
    }
  }

  // Build path
  const path: string[] = [];
  let current: string | null = endNode;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  return {
    distance: distances[endNode],
    path,
  };
}