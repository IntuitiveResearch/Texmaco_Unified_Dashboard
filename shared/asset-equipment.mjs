// Shared equipment metadata for all plant assets.
export const COMPRESSOR_MODEL = 'G 160 V2';
export const COMPRESSOR_1_SERIAL_NUMBER = 'PNB960437';
export const COMPRESSOR_2_SERIAL_NUMBER = 'PNB960273';

export const CNC_ASSET_LABEL = 'CNC#01';
export const CNC_API_PK = 'MACHINE#PI4G/TXMCNCI/26001';

export const ROBO_ASSET_LABEL = 'ROBO#01';
export const ROBO_API_PK = 'MACHINE#PI4G/TXMMIGI/26001';

export const SUPPORTED_ASSETS = ['CMP#01', 'CMP#02', 'CNC#01', 'ROBO#01'];

export const ASSET_MAP = {
  'CMP#01': { id: 'CMP#01', deviceType: 'compressor', apiId: 'CMP#01', label: 'Compressor 1' },
  'CMP01': { id: 'CMP#01', deviceType: 'compressor', apiId: 'CMP#01', label: 'Compressor 1' },
  'CMP#02': { id: 'CMP#02', deviceType: 'compressor', apiId: 'CMP#02', label: 'Compressor 2' },
  'CMP02': { id: 'CMP#02', deviceType: 'compressor', apiId: 'CMP#02', label: 'Compressor 2' },
  'CNC#01': { id: 'CNC#01', deviceType: 'cnc_cutter', apiId: CNC_API_PK, label: 'CNC Cutter 1' },
  'CNC01': { id: 'CNC#01', deviceType: 'cnc_cutter', apiId: CNC_API_PK, label: 'CNC Cutter 1' },
  [CNC_API_PK]: { id: 'CNC#01', deviceType: 'cnc_cutter', apiId: CNC_API_PK, label: 'CNC Cutter 1' },
  'ROBO#01': { id: 'ROBO#01', deviceType: 'welding_robot', apiId: ROBO_API_PK, label: 'Robo welder' },
  'ROBO01': { id: 'ROBO#01', deviceType: 'welding_robot', apiId: ROBO_API_PK, label: 'Robo welder' },
  'Robo welder': { id: 'ROBO#01', deviceType: 'welding_robot', apiId: ROBO_API_PK, label: 'Robo welder' },
  'Robo Welder': { id: 'ROBO#01', deviceType: 'welding_robot', apiId: ROBO_API_PK, label: 'Robo welder' },
  [ROBO_API_PK]: { id: 'ROBO#01', deviceType: 'welding_robot', apiId: ROBO_API_PK, label: 'Robo welder' },
};

export function canonicalAssetId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (ASSET_MAP[trimmed]) return ASSET_MAP[trimmed].id;
  const upper = trimmed.toUpperCase();
  if (ASSET_MAP[upper]) return ASSET_MAP[upper].id;
  if (upper.includes('TXMCNCI') || upper.includes('CNC')) return 'CNC#01';
  if (upper.includes('TXMMIGI') || upper.includes('ROBO') || upper.includes('WELDER')) return 'ROBO#01';
  if (upper.includes('CMP01') || upper === 'CMP#01' || upper === '01') return 'CMP#01';
  if (upper.includes('CMP02') || upper === 'CMP#02' || upper === '02') return 'CMP#02';
  return null;
}

export function getAssetApiIdentifier(assetId) {
  const canonical = canonicalAssetId(assetId) || assetId;
  return ASSET_MAP[canonical]?.apiId || assetId;
}

export function getAssetEquipment(assetId) {
  const canonical = canonicalAssetId(assetId) || assetId;
  if (canonical === 'CMP#01' || canonical === 'CMP#02') {
    return {
      manufacturer: 'Atlas Copco',
      model: COMPRESSOR_MODEL,
      device_type: 'compressor',
      assignment_status: 'assumed_same_specifications',
      source: 'User-provided nameplate photograph; user assumes both compressors share its model and ratings.',
      nameplate_ratings: {
        maximum_final_pressure_bar_e: 8.5,
        rated_free_air_delivery_l_per_s: 478,
        rated_free_air_delivery_m3_per_min: 28.68,
        motor_rating_kw: 160,
      },
      serial_number: canonical === 'CMP#01' ? COMPRESSOR_1_SERIAL_NUMBER : COMPRESSOR_2_SERIAL_NUMBER,
      manufacture_year: null,
      drive_type: null,
      cooling_type: null,
      rated_motor_current_a: null,
      temperature_limits_c: null,
      vibration_limits: null,
      sensor_locations: null,
      manual_reference: null,
    };
  }
  if (canonical === 'CNC#01') {
    return {
      manufacturer: null,
      model: 'Metal Oxide Cutter',
      device_type: 'cnc_cutter',
      assignment_status: 'plant_configured_equipment',
      source: 'User-configured plant asset metadata.',
      nameplate_ratings: {
        process_type: 'Metal oxide / oxy-fuel & plasma profile cutting',
        cutting_bed: 'Heavy industrial gantry',
      },
      serial_number: CNC_API_PK,
      manufacture_year: null,
      drive_type: 'Dual-side rack & pinion CNC drive',
      cooling_type: null,
      rated_motor_current_a: null,
      temperature_limits_c: null,
      vibration_limits: null,
      sensor_locations: null,
      manual_reference: null,
    };
  }
  if (canonical === 'ROBO#01') {
    return {
      manufacturer: null,
      model: 'Robotic Arm Welder',
      device_type: 'welding_robot',
      assignment_status: 'plant_configured_equipment',
      source: 'User-configured plant asset metadata.',
      nameplate_ratings: {
        process_type: 'MIG / MAG automated robotic welding cell',
        robot_kinematics: 'Articulated industrial robot arm',
      },
      serial_number: ROBO_API_PK,
      manufacture_year: null,
      drive_type: 'Servo motor multi-axis drive',
      cooling_type: 'Water-cooled welding torch',
      rated_motor_current_a: null,
      temperature_limits_c: null,
      vibration_limits: null,
      sensor_locations: null,
      manual_reference: null,
    };
  }
  throw new Error(`No equipment profile is configured for asset: ${assetId}`);
}

export function getCompressorEquipment(asset) {
  return getAssetEquipment(asset);
}
