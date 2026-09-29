/**
 * Vehicle styling and tuning customization options
 */
export const ColorPalettes = {
  paint: [
    { name: 'Crimson Red', hex: 0xd91424 },
    { name: 'Cyber Cyan', hex: 0x00d2ff },
    { name: 'Solar Gold', hex: 0xffb703 },
    { name: 'Stealth Onyx', hex: 0x141416 },
    { name: 'Emerald Pearl', hex: 0x06d6a0 },
    { name: 'Miami Magenta', hex: 0xf72585 },
    { name: 'Alpine White', hex: 0xf5f5f7 },
    { name: 'Nardo Grey', hex: 0x6c757d }
  ],
  rims: [
    { name: 'Mirror Chrome', hex: 0xf5f5f5 },
    { name: 'Gunmetal Alloy', hex: 0x3a3f47 },
    { name: 'Race Bronze', hex: 0xba8c59 },
    { name: 'Gloss Black', hex: 0x111111 }
  ],
  calipers: [
    { name: 'Race Red', hex: 0xff2200 },
    { name: 'Acid Green', hex: 0x39ff14 },
    { name: 'Electric Blue', hex: 0x00f0ff },
    { name: 'Solar Yellow', hex: 0xffea00 }
  ],
  underglow: [
    { name: 'Off', hex: 0x000000, intensity: 0 },
    { name: 'Cyan Neon', hex: 0x00ffff, intensity: 3.0 },
    { name: 'Magenta Glow', hex: 0xff007f, intensity: 3.0 },
    { name: 'Lime Venom', hex: 0x00ff44, intensity: 3.0 },
    { name: 'Ultra Violet', hex: 0x7b2cbf, intensity: 3.0 }
  ]
};

export class VehicleCustomization {
  constructor() {
    this.customizations = {
      falcon_s1: {
        paint: ColorPalettes.paint[1].hex, // Cyber Cyan
        paintIndex: 1,
        rims: ColorPalettes.rims[1].hex,  // Gunmetal Alloy
        rimIndex: 1,
        calipers: ColorPalettes.calipers[2].hex, // Electric Blue
        underglow: ColorPalettes.underglow[1],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'FWD'
      },
      nova_x: {
        paint: 0x1f3c88, // Deep Royal Navy
        paintIndex: 6,
        rims: ColorPalettes.rims[0].hex,  // Mirror Chrome
        rimIndex: 0,
        calipers: ColorPalettes.calipers[0].hex, // Race Red
        underglow: ColorPalettes.underglow[0],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'AWD'
      },
      vortex_gt: {
        paint: 0xe65100, // Burnt Amber Orange
        paintIndex: 2,
        rims: ColorPalettes.rims[2].hex,  // Race Bronze
        rimIndex: 2,
        calipers: ColorPalettes.calipers[0].hex, // Race Red
        underglow: ColorPalettes.underglow[2],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'RWD'
      },
      apex_r: {
        paint: 0xcc1111, // Rosso Corsa Red
        paintIndex: 0,
        rims: ColorPalettes.rims[3].hex,  // Gloss Black
        rimIndex: 3,
        calipers: ColorPalettes.calipers[1].hex, // Acid Green
        underglow: ColorPalettes.underglow[1],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'AWD'
      },
      titan_sport: {
        paint: ColorPalettes.paint[3].hex, // Stealth Onyx
        paintIndex: 3,
        rims: ColorPalettes.rims[2].hex,  // Race Bronze
        rimIndex: 2,
        calipers: ColorPalettes.calipers[3].hex, // Solar Yellow
        underglow: ColorPalettes.underglow[4],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'AWD'
      },
      aero_roadster: {
        paint: ColorPalettes.paint[2].hex, // Solar Gold
        paintIndex: 2,
        rims: ColorPalettes.rims[0].hex,  // Mirror Chrome
        rimIndex: 0,
        calipers: ColorPalettes.calipers[0].hex, // Race Red
        underglow: ColorPalettes.underglow[2],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'RWD'
      },
      apex_gt: {
        paint: ColorPalettes.paint[0].hex,
        paintIndex: 0,
        rims: ColorPalettes.rims[0].hex,
        rimIndex: 0,
        calipers: ColorPalettes.calipers[0].hex,
        underglow: ColorPalettes.underglow[1],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'AWD'
      },
      venom_spyder: {
        paint: ColorPalettes.paint[2].hex,
        paintIndex: 2,
        rims: ColorPalettes.rims[1].hex,
        rimIndex: 1,
        calipers: ColorPalettes.calipers[1].hex,
        underglow: ColorPalettes.underglow[2],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'RWD'
      },
      titan_4x4: {
        paint: ColorPalettes.paint[4].hex,
        paintIndex: 4,
        rims: ColorPalettes.rims[1].hex,
        rimIndex: 1,
        calipers: ColorPalettes.calipers[0].hex,
        underglow: ColorPalettes.underglow[0],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: '4WD'
      },
      urban_pulse: {
        paint: ColorPalettes.paint[1].hex,
        paintIndex: 1,
        rims: ColorPalettes.rims[0].hex,
        rimIndex: 0,
        calipers: ColorPalettes.calipers[2].hex,
        underglow: ColorPalettes.underglow[3],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'FWD'
      },
      formula_r: {
        paint: ColorPalettes.paint[5].hex,
        paintIndex: 5,
        rims: ColorPalettes.rims[3].hex,
        rimIndex: 3,
        calipers: ColorPalettes.calipers[0].hex,
        underglow: ColorPalettes.underglow[1],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'RWD'
      }
    };
  }

  get(vehicleId) {
    if (!this.customizations[vehicleId]) {
      this.customizations[vehicleId] = {
        paint: ColorPalettes.paint[0].hex,
        paintIndex: 0,
        rims: ColorPalettes.rims[0].hex,
        rimIndex: 0,
        calipers: ColorPalettes.calipers[0].hex,
        underglow: ColorPalettes.underglow[0],
        rideHeightOffset: 0,
        handlingRatio: 0.5,
        driveType: 'AWD'
      };
    }
    return this.customizations[vehicleId];
  }

  apply(vehicle, vehicleId) {
    const cfg = this.get(vehicleId);
    if (!vehicle) return;
    if (typeof vehicle.setPaintColor === 'function') vehicle.setPaintColor(cfg.paint);
    if (typeof vehicle.setRimColor === 'function') vehicle.setRimColor(cfg.rims);
    if (typeof vehicle.setCaliperColor === 'function') vehicle.setCaliperColor(cfg.calipers);
    if (cfg.underglow && typeof vehicle.setUnderglow === 'function') {
      vehicle.setUnderglow(cfg.underglow.hex, cfg.underglow.intensity);
    }
    if (cfg.rideHeightOffset !== undefined && typeof vehicle.setRideHeightOffset === 'function') {
      vehicle.setRideHeightOffset(cfg.rideHeightOffset);
    }
    if (cfg.handlingRatio !== undefined && typeof vehicle.setHandlingSetting === 'function') {
      vehicle.setHandlingSetting(cfg.handlingRatio);
    }
    if (cfg.driveType && typeof vehicle.setDriveType === 'function') {
      vehicle.setDriveType(cfg.driveType);
    }
  }

  setPaint(vehicleId, hex, vehicle, index = 0) {
    const cfg = this.get(vehicleId);
    cfg.paint = hex;
    cfg.paintIndex = index;
    if (vehicle && typeof vehicle.setPaintColor === 'function') vehicle.setPaintColor(hex);
  }

  setRims(vehicleId, hex, vehicle, index = 0) {
    const cfg = this.get(vehicleId);
    cfg.rims = hex;
    cfg.rimIndex = index;
    if (vehicle && typeof vehicle.setRimColor === 'function') vehicle.setRimColor(hex);
  }

  setRideHeight(vehicleId, offset, vehicle) {
    const cfg = this.get(vehicleId);
    cfg.rideHeightOffset = offset;
    if (vehicle && typeof vehicle.setRideHeightOffset === 'function') {
      vehicle.setRideHeightOffset(offset);
    }
  }

  setHandling(vehicleId, ratio, vehicle) {
    const cfg = this.get(vehicleId);
    cfg.handlingRatio = ratio;
    if (vehicle && typeof vehicle.setHandlingSetting === 'function') {
      vehicle.setHandlingSetting(ratio);
    }
  }

  setDrive(vehicleId, driveType, vehicle) {
    const cfg = this.get(vehicleId);
    cfg.driveType = driveType;
    if (vehicle && typeof vehicle.setDriveType === 'function') {
      vehicle.setDriveType(driveType);
    }
  }

  setCalipers(vehicleId, hex, vehicle) {
    this.get(vehicleId).calipers = hex;
    if (vehicle && typeof vehicle.setCaliperColor === 'function') vehicle.setCaliperColor(hex);
  }

  setUnderglow(vehicleId, option, vehicle) {
    this.get(vehicleId).underglow = option;
    if (vehicle && typeof vehicle.setUnderglow === 'function') vehicle.setUnderglow(option.hex, option.intensity);
  }
}
