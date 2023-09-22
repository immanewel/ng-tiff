import { Component } from '@angular/core';
import * as L from 'leaflet'
import { fromBlob } from 'geotiff';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ng-tiff';
  map!: L.Map;

  async handlefileInput(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement?.files?.[0];
    if (!file) return;
    return await this.handleGeoTIFF(file);
  }
  async handleGeoTIFF(file: File): Promise<void> {
    // Load the GeoTIFF file
    const tiff = await fromBlob(file);

    // Read the image from the GeoTIFF
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();

    // Read the image data as RGBA
    const [raster] = await image.readRasters();
    const bbox = image.getBoundingBox();

    // Create a canvas element to display the image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) return;
    // Create an ImageData object and set the image data
    const imageData = context.createImageData(width, height);
    imageData.data.set(new Uint8Array(raster as number));
    context.putImageData(imageData, 0, 0);

    // Create a Leaflet image overlay
    const imageUrl = canvas.toDataURL();
    let corner1 = L.latLng([bbox[1], bbox[0]]);
    let corner2 = L.latLng([bbox[3], bbox[2]]);
    let tiffBbox = new L.LatLngBounds(corner1, corner2);

    let blank = L.tileLayer('');
    let polygonGroup = new L.FeatureGroup();
    let geoTiff = new L.FeatureGroup();
    this.map = L.map('map', <any>{
      layers: [blank, polygonGroup, geoTiff],
      attributionControl: false,
    }).setView([51.505, -0.09], 13);
    L.rectangle(tiffBbox, { fillColor: 'green' }).addTo(geoTiff);
    L.imageOverlay(imageUrl, tiffBbox).addTo(geoTiff);

    // Add a tile layer for the base map
    let base0 = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.map);
    let base1 = L.tileLayer(
      'http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      { maxZoom: 1000, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
    ).addTo(this.map);
    let overlays = {
      GeoTiff: geoTiff,
    };

    let baseLayers = {
      blank: blank,
      'Base Map': base0,
      'Google Map': base1,
    };
    L.control
      .layers(baseLayers, overlays, {
        position: 'bottomleft',
        collapsed: false,
      })
      .addTo(this.map);

    this.map.flyToBounds(tiffBbox);
  }

}
