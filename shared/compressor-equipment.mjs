// Shared display/report metadata. Ratings are transcribed from the supplied nameplate.
// The user asked us to assume that both compressors have the same specification;
// Each compressor retains its user-provided configured identifier.
export const COMPRESSOR_MODEL = 'G 160 V2';
export const COMPRESSOR_1_SERIAL_NUMBER = 'PNB960437';
export const COMPRESSOR_2_SERIAL_NUMBER = 'PNB960273';

export function getCompressorEquipment(asset) {
  if (!['CMP#01', 'CMP#02'].includes(asset)) throw new Error('No equipment profile is configured for this asset.');
  return {
    manufacturer: 'Atlas Copco',
    model: COMPRESSOR_MODEL,
    assignment_status: 'assumed_same_specifications',
    source: 'User-provided nameplate photograph; user assumes both compressors share its model and ratings.',
    nameplate_ratings: {
      maximum_final_pressure_bar_e: 8.5,
      rated_free_air_delivery_l_per_s: 478,
      rated_free_air_delivery_m3_per_min: 28.68,
      motor_rating_kw: 160,
    },
    // Serial number and manufacture year identify an individual machine, not a model.
    serial_number: asset === 'CMP#01' ? COMPRESSOR_1_SERIAL_NUMBER : COMPRESSOR_2_SERIAL_NUMBER,
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
