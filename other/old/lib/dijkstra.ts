interface Graph {
  [key: string]: { [key: string]: number };
}

interface ShortestPaths {
  [key: string]: {
    distance: number;
    path: string[];
  };
}

export function dijkstra(graph: Graph, startNode: string, endNode: string) {
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const unvisited = new Set<string>();

  // Initialize distances
  for (const node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  }
  distances[startNode] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentNode = Array.from(unvisited).reduce((minNode, node) => 
      distances[node] < distances[minNode] ? node : minNode
    );

    if (currentNode === endNode) break;

    unvisited.delete(currentNode);

    // Update distances to neighbors
    for (const neighbor in graph[currentNode]) {
      if (unvisited.has(neighbor)) {
        const distance = distances[currentNode] + graph[currentNode][neighbor];
        if (distance < distances[neighbor]) {
          distances[neighbor] = distance;
          previous[neighbor] = currentNode;
        }
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
    path
  };
}