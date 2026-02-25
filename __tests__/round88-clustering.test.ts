import { describe, it, expect } from "vitest";

// Replicate the clustering algorithm from map-view-wrapper.native.tsx for testing
interface MapMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  id?: string | number;
}

interface ClusterItem {
  type: "cluster";
  id: string;
  coordinate: { latitude: number; longitude: number };
  count: number;
  markers: MapMarkerProps[];
}

interface SingleItem {
  type: "single";
  marker: MapMarkerProps;
}

type ClusteredItem = ClusterItem | SingleItem;

function clusterMarkers(
  markers: MapMarkerProps[],
  latDelta: number,
): ClusteredItem[] {
  if (markers.length === 0) return [];

  const threshold = latDelta * 0.08;
  const used = new Set<number>();
  const result: ClusteredItem[] = [];

  for (let i = 0; i < markers.length; i++) {
    if (used.has(i)) continue;

    const group: MapMarkerProps[] = [markers[i]];
    used.add(i);

    for (let j = i + 1; j < markers.length; j++) {
      if (used.has(j)) continue;

      const dLat = Math.abs(markers[i].coordinate.latitude - markers[j].coordinate.latitude);
      const dLng = Math.abs(markers[i].coordinate.longitude - markers[j].coordinate.longitude);

      if (dLat < threshold && dLng < threshold) {
        group.push(markers[j]);
        used.add(j);
      }
    }

    if (group.length === 1) {
      result.push({ type: "single", marker: group[0] });
    } else {
      const avgLat = group.reduce((sum, m) => sum + m.coordinate.latitude, 0) / group.length;
      const avgLng = group.reduce((sum, m) => sum + m.coordinate.longitude, 0) / group.length;
      result.push({
        type: "cluster",
        id: `cluster-${i}`,
        coordinate: { latitude: avgLat, longitude: avgLng },
        count: group.length,
        markers: group,
      });
    }
  }

  return result;
}

describe("Map marker clustering", () => {
  it("returns empty array for no markers", () => {
    const result = clusterMarkers([], 0.1);
    expect(result).toEqual([]);
  });

  it("returns single items when markers are far apart", () => {
    const markers: MapMarkerProps[] = [
      { id: "a", coordinate: { latitude: 22.3, longitude: 114.1 }, title: "A" },
      { id: "b", coordinate: { latitude: 22.5, longitude: 114.3 }, title: "B" },
    ];
    // latDelta = 0.1, threshold = 0.008
    // distance between markers: 0.2 lat, 0.2 lng — far apart
    const result = clusterMarkers(markers, 0.1);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("single");
    expect(result[1].type).toBe("single");
  });

  it("clusters markers that are very close together", () => {
    const markers: MapMarkerProps[] = [
      { id: "a", coordinate: { latitude: 22.300, longitude: 114.100 }, title: "A" },
      { id: "b", coordinate: { latitude: 22.301, longitude: 114.101 }, title: "B" },
      { id: "c", coordinate: { latitude: 22.302, longitude: 114.100 }, title: "C" },
    ];
    // latDelta = 0.1, threshold = 0.008
    // All markers are within 0.002 lat of each other — should cluster
    const result = clusterMarkers(markers, 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("cluster");
    if (result[0].type === "cluster") {
      expect(result[0].count).toBe(3);
      expect(result[0].markers).toHaveLength(3);
      // Check centroid is the average
      expect(result[0].coordinate.latitude).toBeCloseTo((22.300 + 22.301 + 22.302) / 3, 5);
      expect(result[0].coordinate.longitude).toBeCloseTo((114.100 + 114.101 + 114.100) / 3, 5);
    }
  });

  it("separates clusters when zoomed in (small latDelta)", () => {
    const markers: MapMarkerProps[] = [
      { id: "a", coordinate: { latitude: 22.300, longitude: 114.100 }, title: "A" },
      { id: "b", coordinate: { latitude: 22.301, longitude: 114.101 }, title: "B" },
    ];
    // latDelta = 0.005 (very zoomed in), threshold = 0.0004
    // distance between markers: 0.001 lat, 0.001 lng — larger than threshold
    const result = clusterMarkers(markers, 0.005);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("single");
    expect(result[1].type).toBe("single");
  });

  it("clusters same markers when zoomed out (large latDelta)", () => {
    const markers: MapMarkerProps[] = [
      { id: "a", coordinate: { latitude: 22.300, longitude: 114.100 }, title: "A" },
      { id: "b", coordinate: { latitude: 22.301, longitude: 114.101 }, title: "B" },
    ];
    // latDelta = 0.5 (zoomed out), threshold = 0.04
    // distance between markers: 0.001 lat, 0.001 lng — well within threshold
    const result = clusterMarkers(markers, 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("cluster");
    if (result[0].type === "cluster") {
      expect(result[0].count).toBe(2);
    }
  });

  it("creates multiple clusters for separate groups", () => {
    const markers: MapMarkerProps[] = [
      // Group 1: Hong Kong Island
      { id: "a", coordinate: { latitude: 22.280, longitude: 114.150 }, title: "A" },
      { id: "b", coordinate: { latitude: 22.281, longitude: 114.151 }, title: "B" },
      // Group 2: Kowloon (far from Group 1)
      { id: "c", coordinate: { latitude: 22.320, longitude: 114.170 }, title: "C" },
      { id: "d", coordinate: { latitude: 22.321, longitude: 114.171 }, title: "D" },
    ];
    // latDelta = 0.1, threshold = 0.008
    // Group 1 distance: 0.001 (within threshold)
    // Group 2 distance: 0.001 (within threshold)
    // Inter-group distance: 0.04 (beyond threshold)
    const result = clusterMarkers(markers, 0.1);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("cluster");
    expect(result[1].type).toBe("cluster");
    if (result[0].type === "cluster" && result[1].type === "cluster") {
      expect(result[0].count).toBe(2);
      expect(result[1].count).toBe(2);
    }
  });

  it("handles single marker correctly", () => {
    const markers: MapMarkerProps[] = [
      { id: "a", coordinate: { latitude: 22.300, longitude: 114.100 }, title: "A" },
    ];
    const result = clusterMarkers(markers, 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("single");
    if (result[0].type === "single") {
      expect(result[0].marker.id).toBe("a");
    }
  });

  it("mixes clusters and singles when some are close and some are far", () => {
    const markers: MapMarkerProps[] = [
      // Close together
      { id: "a", coordinate: { latitude: 22.300, longitude: 114.100 }, title: "A" },
      { id: "b", coordinate: { latitude: 22.301, longitude: 114.100 }, title: "B" },
      // Far away
      { id: "c", coordinate: { latitude: 22.500, longitude: 114.300 }, title: "C" },
    ];
    // latDelta = 0.1, threshold = 0.008
    const result = clusterMarkers(markers, 0.1);
    expect(result).toHaveLength(2);
    const cluster = result.find(r => r.type === "cluster");
    const single = result.find(r => r.type === "single");
    expect(cluster).toBeDefined();
    expect(single).toBeDefined();
    if (cluster?.type === "cluster") {
      expect(cluster.count).toBe(2);
    }
    if (single?.type === "single") {
      expect(single.marker.id).toBe("c");
    }
  });
});
