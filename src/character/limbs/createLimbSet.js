export function createLimbSet(createArm, createLeg) {
  return {
    armLeft: createArm(-1),
    armRight: createArm(1),
    legLeft: createLeg(-1),
    legRight: createLeg(1),
  }
}
