export interface VectorLike {
  x: number;
  y: number;
}

export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number);
  constructor(coords: VectorLike);
  constructor(x_or_coords: number | VectorLike, y?: number) {
    if (typeof x_or_coords === "object") {
      this.x = x_or_coords.x;
      this.y = x_or_coords.y;
    } else {
      this.x = x_or_coords;
      this.y = y ?? 0;
    }
  }

  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  add(other: Vector | VectorLike): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector | VectorLike): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector {
    if (scalar === 0) {
      throw new Error("Cannot divide by zero");
    }

    return new Vector(this.x / scalar, this.y / scalar);
  }

  negate(): Vector {
    return new Vector(-this.x, -this.y);
  }

  dot(other: Vector | VectorLike): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector | VectorLike): number {
    return this.x * other.y - this.y * other.x;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitude_squared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector(0, 0);
    }

    return this.divide(mag);
  }

  dist_to(other: Vector | VectorLike): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  dist_to_squared(other: Vector | VectorLike): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;

    return dx * dx + dy * dy;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angle_to(other: Vector | VectorLike): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  rotate(angle: number): Vector {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return new Vector(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  lerp(other: Vector | VectorLike, t: number): Vector {
    return new Vector(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  floor(): Vector {
    return new Vector(Math.floor(this.x), Math.floor(this.y));
  }

  ceil(): Vector {
    return new Vector(Math.ceil(this.x), Math.ceil(this.y));
  }

  round(): Vector {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }

  abs(): Vector {
    return new Vector(Math.abs(this.x), Math.abs(this.y));
  }

  min(other: Vector | VectorLike): Vector {
    return new Vector(Math.min(this.x, other.x), Math.min(this.y, other.y));
  }

  max(other: Vector | VectorLike): Vector {
    return new Vector(Math.max(this.x, other.x), Math.max(this.y, other.y));
  }

  clamp(min_val: Vector | VectorLike, max_val: Vector | VectorLike): Vector {
    return this.max(min_val).min(max_val);
  }

  closest(vectors: (Vector | VectorLike)[]): Vector {
    if (vectors.length === 0) {
      return this.copy();
    }

    let closest = vectors[0];
    if (!closest) {
      return this.copy();
    }

    let min_dist = this.dist_to_squared(closest);

    for (let i = 1; i < vectors.length; i++) {
      const vec = vectors[i];
      if (!vec) continue;

      const dist = this.dist_to_squared(vec);
      if (dist < min_dist) {
        min_dist = dist;
        closest = vec;
      }
    }

    return new Vector(closest.x, closest.y);
  }

  furthest(vectors: (Vector | VectorLike)[]): Vector {
    if (vectors.length === 0) {
      return this.copy();
    }

    let furthest = vectors[0];
    if (!furthest) {
      return this.copy();
    }

    let max_dist = this.dist_to_squared(furthest);
    for (let i = 1; i < vectors.length; i++) {
      const vec = vectors[i];
      if (!vec) continue;

      const dist = this.dist_to_squared(vec);
      if (dist > max_dist) {
        max_dist = dist;
        furthest = vec;
      }
    }

    return new Vector(furthest.x, furthest.y);
  }

  equals(other: Vector | VectorLike, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  set(x: number, y: number): Vector {
    this.x = x;
    this.y = y;
    return this;
  }

  set_from(other: Vector | VectorLike): Vector {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  to_object(): VectorLike {
    return { x: this.x, y: this.y };
  }

  to_array(): [number, number] {
    return [this.x, this.y];
  }

  toString(): string {
    return `Vector(${this.x}, ${this.y})`;
  }

  static zero(): Vector {
    return new Vector(0, 0);
  }

  static one(): Vector {
    return new Vector(1, 1);
  }

  static up(): Vector {
    return new Vector(0, -1);
  }

  static down(): Vector {
    return new Vector(0, 1);
  }

  static left(): Vector {
    return new Vector(-1, 0);
  }

  static right(): Vector {
    return new Vector(1, 0);
  }

  static from_angle(angle: number, magnitude: number = 1): Vector {
    return new Vector(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  static min_vec(vectors: (Vector | VectorLike)[]): Vector {
    if (vectors.length === 0) {
      return Vector.zero();
    }

    let min_x = Infinity;
    let min_y = Infinity;

    for (const vec of vectors) {
      if (!vec) continue;
      min_x = Math.min(min_x, vec.x);
      min_y = Math.min(min_y, vec.y);
    }

    return new Vector(min_x, min_y);
  }

  static max_vec(vectors: (Vector | VectorLike)[]): Vector {
    if (vectors.length === 0) {
      return Vector.zero();
    }

    let max_x = -Infinity;
    let max_y = -Infinity;

    for (const vec of vectors) {
      if (!vec) continue;
      max_x = Math.max(max_x, vec.x);
      max_y = Math.max(max_y, vec.y);
    }

    return new Vector(max_x, max_y);
  }

  static sum(vectors: (Vector | VectorLike)[]): Vector {
    let sum_x = 0;
    let sum_y = 0;

    for (const vec of vectors) {
      if (!vec) continue;
      sum_x += vec.x;
      sum_y += vec.y;
    }

    return new Vector(sum_x, sum_y);
  }

  static average(vectors: (Vector | VectorLike)[]): Vector {
    if (vectors.length === 0) {
      return Vector.zero();
    }

    const sum = Vector.sum(vectors);
    return sum.divide(vectors.length);
  }
}

export function vector(x: number, y: number): Vector;
export function vector(coords: VectorLike): Vector;
export function vector(x_or_coords: number | VectorLike, y?: number): Vector {
  return new Vector(x_or_coords as any, y as any);
}
