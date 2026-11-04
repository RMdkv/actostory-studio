import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RunPoint } from "@/lib/run/geo";

type Props = {
  route: RunPoint[];
  position?: { lat: number; lng: number } | null;
  follow?: boolean;
  interactive?: boolean;
  className?: string;
};

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#76e600";
}

export default function RunMap({ route, position, follow = true, interactive = true, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const lines = useRef<L.LayerGroup | null>(null);
  const dot = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      zoomControl: false, attributionControl: true,
      dragging: interactive, scrollWheelZoom: interactive, touchZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: interactive,
    }).setView([-23.55, -46.63], 3);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    lines.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; dot.current = null; };
  }, [interactive]);

  useEffect(() => {
    const m = map.current, g = lines.current;
    if (!m || !g) return;
    g.clearLayers();
    const color = cssVar("--primary");
    const segs = new Map<number, [number, number][]>();
    for (const p of route) {
      const s = segs.get(p.seg) ?? [];
      s.push([p.lat, p.lng]);
      segs.set(p.seg, s);
    }
    segs.forEach((pts) => L.polyline(pts, { color, weight: 5, opacity: 0.95, lineCap: "round" }).addTo(g));
    if (!interactive && route.length > 1) {
      m.fitBounds(L.latLngBounds(route.map((p) => [p.lat, p.lng])), { padding: [16, 16] });
    } else if (!interactive && route[0]) {
      m.setView([route[0].lat, route[0].lng], 16);
    }
  }, [route, interactive]);

  useEffect(() => {
    const m = map.current;
    if (!m || !position) return;
    const ll: [number, number] = [position.lat, position.lng];
    if (!dot.current) {
      dot.current = L.circleMarker(ll, { radius: 8, color: "#ffffff", weight: 3, fillColor: cssVar("--primary"), fillOpacity: 1 }).addTo(m);
      m.setView(ll, 17);
    } else {
      dot.current.setLatLng(ll);
      if (follow) m.panTo(ll, { animate: true });
    }
  }, [position, follow]);

  return <div ref={el} className={`acto-run-map ${className ?? ""}`} style={{ zIndex: 0 }} />;
}
