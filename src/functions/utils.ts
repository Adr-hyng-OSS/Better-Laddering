import { Vector3 } from "@minecraft/server";

function degToRad (deg: number): number {
    let rid = Math.PI/180;
    return deg * rid;
}

function radToDeg (rad: number): number {
    let dir = 180/Math.PI;
    return rad * dir;
}

function norm (x: number, y: number, z: number): [number, number, number] {
    let magnitude = Math.sqrt(x*x + y*y + z*z);
    
    x /= magnitude;
    y /= magnitude;
    z /= magnitude;
    
    return [ x, y, z ];
}

function fromAngle (pitchRad: number, yawRad: number, distance: number = 1): Vector3 {
    let sinYaw = Math.sin(yawRad);
    let sinPitch = Math.sin(pitchRad);
    let cosYaw = Math.cos(yawRad);
    let cosPitch = Math.cos(pitchRad);
    
    return {
        x : distance * -sinYaw * cosPitch,
        y : distance * -sinPitch,
        z : distance * cosYaw * cosPitch
    };
}
    
function toAngle (x: number, y: number, z: number): { pitchRad: number, yawRad: number } {
    [ x, y, z ] = norm(x, y, z);
    
    let dir = 180/Math.PI;
    
    let pitchRad = (Math.asin(-y));
    let yawRad = (Math.atan2(-x, z));
    
    return { pitchRad, yawRad };
}