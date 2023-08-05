function getCardinalFacing(yRotation: number): number {
    if (yRotation >= -45 && yRotation <= 45) {
      return 2;
    } else if (yRotation > 45 && yRotation <= 135) {
      return 5;
    } else if (yRotation > 135 || yRotation <= -135) {
      return 3;
    } else if (yRotation > -135 && yRotation <= -45) {
      return 4;
    } else {
      // Handle cases where the yRotation is outside the range -179 to 179
      // This depends on how you want to handle invalid inputs
      return 1;
    }
  }

  export {getCardinalFacing};