import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { MapContainer, TileLayer, FeatureGroup, Polygon } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";

const DEFAULT_CENTER = [23.0587, 72.6718];

function geoJsonToPositions(boundary) {
    if (!boundary?.coordinates?.[0]) return [];

    return boundary.coordinates[0].map(([lng, lat]) => [lat, lng]);
}

function layerToGeoJson(layer) {
    const geoJson = layer.toGeoJSON();

    if (geoJson?.geometry?.type !== "Polygon") {
        return null;
    }

    return {
        type: "Polygon",
        coordinates: geoJson.geometry.coordinates,
    };
}

export function WarehouseServiceAreaMap({ value, onChange }) {
    const positions = geoJsonToPositions(value);

    const center = positions.length > 0 ? positions[0] : DEFAULT_CENTER;

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: 320, width: "100%" }}
                scrollWheelZoom
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FeatureGroup>
                    <EditControl
                        position="topright"
                        draw={{
                            rectangle: false,
                            circle: false,
                            circlemarker: false,
                            marker: false,
                            polyline: false,
                            polygon: true,
                        }}
                        edit={{
                            edit: {
                                selectedPathOptions: {
                                    maintainColor: true,
                                },
                            },
                            remove: true,
                        }}
                        onCreated={(e) => {
                            const boundary = layerToGeoJson(e.layer);
                            onChange(boundary);
                        }}
                        onEdited={(e) => {
                            e.layers.eachLayer((layer) => {
                                const boundary = layerToGeoJson(layer);
                                onChange(boundary);
                            });
                        }}
                        onDeleted={() => {
                            onChange(null);
                        }}
                    />

                    {positions.length > 0 ? (
                        <Polygon positions={positions} />
                    ) : null}
                </FeatureGroup>
            </MapContainer>
        </div>
    );
}