"""
Geographic utility functions for lat/lng calculations.
"""
import math


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0  # Earth's radius in km

    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def euclidean_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Simple Euclidean distance in degrees (for fast proximity sorting)."""
    return math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2)


def find_nearest(lat: float, lng: float, items: list, lat_key: str = "lat", lng_key: str = "lng") -> dict:
    """Find the nearest item from a list based on Euclidean distance."""
    if not items:
        return None
    return min(items, key=lambda item: euclidean_distance(lat, lng, item[lat_key], item[lng_key]))


def points_within_radius(center_lat: float, center_lng: float, points: list,
                          radius_deg: float = 0.005, lat_key: str = "lat", lng_key: str = "lng") -> list:
    """Filter points within a given degree radius of a center point."""
    return [
        p for p in points
        if euclidean_distance(center_lat, center_lng, p[lat_key], p[lng_key]) <= radius_deg
    ]


def cluster_points(points: list, cluster_radius: float = 0.005, lat_key: str = "lat", lng_key: str = "lng") -> list:
    """Cluster nearby points and return cluster centers with counts."""
    if not points:
        return []

    used = [False] * len(points)
    clusters = []

    for i, point in enumerate(points):
        if used[i]:
            continue

        cluster_points_list = [point]
        used[i] = True

        for j in range(i + 1, len(points)):
            if not used[j]:
                if euclidean_distance(point[lat_key], point[lng_key],
                                      points[j][lat_key], points[j][lng_key]) <= cluster_radius:
                    cluster_points_list.append(points[j])
                    used[j] = True

        # Compute cluster center
        avg_lat = sum(p[lat_key] for p in cluster_points_list) / len(cluster_points_list)
        avg_lng = sum(p[lng_key] for p in cluster_points_list) / len(cluster_points_list)

        clusters.append({
            "lat": round(avg_lat, 6),
            "lng": round(avg_lng, 6),
            "count": len(cluster_points_list),
            "points": cluster_points_list,
        })

    return sorted(clusters, key=lambda c: c["count"], reverse=True)
