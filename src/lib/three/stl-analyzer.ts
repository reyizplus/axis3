import { Vector3, BufferGeometry } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export interface STLAnalysisResult {
  volume: number;           // cm³
  surfaceArea: number;      // cm²
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  triangleCount: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

/**
 * STL Analyzer - Vanilla Three.js implementation
 * Analyzes STL files and calculates volume, surface area, and dimensions
 */
export class STLAnalyzer {
  private loader: STLLoader;

  constructor() {
    this.loader = new STLLoader();
  }

  /**
   * Load and analyze STL file
   * @param file - File object or URL string
   * @returns Promise<STLAnalysisResult>
   */
  async analyze(file: File | string): Promise<STLAnalysisResult> {
    const geometry = await this.loadSTL(file);
    
    return {
      volume: this.calculateVolume(geometry),
      surfaceArea: this.calculateSurfaceArea(geometry),
      dimensions: this.calculateDimensions(geometry),
      triangleCount: this.getTriangleCount(geometry),
      boundingBox: this.getBoundingBox(geometry),
    };
  }

  /**
   * Load STL file and return BufferGeometry
   */
  private loadSTL(file: File | string): Promise<BufferGeometry> {
    return new Promise((resolve, reject) => {
      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const geometry = this.loader.parse(arrayBuffer);
          geometry.computeVertexNormals();
          resolve(geometry);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      } else {
        this.loader.load(
          file,
          (geometry) => {
            geometry.computeVertexNormals();
            resolve(geometry);
          },
          undefined,
          reject
        );
      }
    });
  }

  /**
   * Calculate volume using signed volume of tetrahedron method
   */
  private calculateVolume(geometry: BufferGeometry): number {
    const positions = geometry.attributes.position.array;
    let volume = 0;

    for (let i = 0; i < positions.length; i += 9) {
      const v1 = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const v2 = new Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const v3 = new Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

      // Signed volume of tetrahedron
      volume += v1.dot(v2.cross(v3)) / 6;
    }

    // Convert to cm³ (assuming input is in mm)
    return Math.abs(volume) / 1000;
  }

  /**
   * Calculate surface area
   */
  private calculateSurfaceArea(geometry: BufferGeometry): number {
    const positions = geometry.attributes.position.array;
    let area = 0;

    for (let i = 0; i < positions.length; i += 9) {
      const v1 = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const v2 = new Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const v3 = new Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

      // Triangle area using cross product
      const edge1 = v2.clone().sub(v1);
      const edge2 = v3.clone().sub(v1);
      area += edge1.cross(edge2).length() / 2;
    }

    // Convert to cm² (assuming input is in mm)
    return area / 100;
  }

  /**
   * Calculate dimensions (bounding box size)
   */
  private calculateDimensions(geometry: BufferGeometry): { x: number; y: number; z: number } {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    
    return {
      x: (bbox.max.x - bbox.min.x) / 10, // Convert mm to cm
      y: (bbox.max.y - bbox.min.y) / 10,
      z: (bbox.max.z - bbox.min.z) / 10,
    };
  }

  /**
   * Get triangle count
   */
  private getTriangleCount(geometry: BufferGeometry): number {
    return geometry.attributes.position.count / 3;
  }

  /**
   * Get bounding box
   */
  private getBoundingBox(geometry: BufferGeometry) {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    
    return {
      min: {
        x: bbox.min.x / 10,
        y: bbox.min.y / 10,
        z: bbox.min.z / 10,
      },
      max: {
        x: bbox.max.x / 10,
        y: bbox.max.y / 10,
        z: bbox.max.z / 10,
      },
    };
  }
}

/**
 * Helper function to create analyzer instance
 */
export function createSTLAnalyzer(): STLAnalyzer {
  return new STLAnalyzer();
}
