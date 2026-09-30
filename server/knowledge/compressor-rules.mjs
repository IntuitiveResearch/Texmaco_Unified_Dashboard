// Normalized reference knowledge, not an OEM fault table or a trained model.
// The diagram supplies possible mechanisms; the sources below support component
// categories and diagnostic methods. G 160 V2 manual/field validation is pending.
export const KNOWLEDGE_VERSION = 'g160-compressor-knowledge-v1';
export const KNOWLEDGE_SOURCES = {
  diagram: { title: 'User-supplied CMP01 compressor system knowledge graph', kind: 'reference_diagram', url: null },
  atlas_g: {
    title: 'Atlas Copco G 110-250 / G 110-160 VSD brochure', kind: 'manufacturer_family_reference',
    url: 'https://www.atlascopco.com/content/dam/atlas-copco/compressor-technique/oil-free-air/documents/G_110-250_G_110-160_VSD_leaflet_EN_Antwerp_2935059012.pdf',
    scope: 'Supports component categories and load/no-load control; not exact G 160 V2 limits, installed options or fault diagnosis.',
  },
  skf_vibration: {
    title: 'SKF: Vibrations help find faulty components', kind: 'diagnostic_method_reference',
    url: 'https://evolution.skf.com/us/vibrations-help-find-faulty-components-3/',
    scope: 'Supports spectrum/baseline verification methods; no compressor-specific vibration thresholds.',
  },
};

export const COMPRESSOR_RULES = [
  {
    id: 'load_control_transitions', kind: 'candidate_hypothesis', triggers: ['interruptions', 'current_variation'],
    components: ['unit controller', 'air intake / suction valve'],
    possible_cause: 'Demand or load/control transitions',
    mechanism: 'Demand changes or control transitions can cause repeated operating changes; interruption counts alone do not identify a failed valve or controller.',
    evidence_needed: ['Event-aligned run/load states and controller stop codes', 'Pressure records and approved control settings', 'Shift schedules and air-demand information'],
    alternatives: ['Planned stops', 'Demand-related operation', 'Confirmed protection events requiring separate investigation'],
    verification_steps: ['Match recorded interruptions to controller events and operating schedules.', 'Compare load/unload transitions with demand and approved settings; verify valve response only if events support it.'],
    source_refs: ['diagram', 'atlas_g'],
  },
  {
    id: 'motor_current_behavior', kind: 'candidate_hypothesis', triggers: ['current_events'],
    components: ['electric drive motor', 'starter / installed drive', 'unit controller'],
    possible_cause: 'Motor-duty or control-related current excursions',
    mechanism: 'Recorded current events may relate to starts, changing mechanical duty or a protection event. Current excursions are not proof of electrical supply instability or overload.',
    evidence_needed: ['Motor rated current and installed starter/drive configuration', 'Current aligned with start/run/load state', 'Controller protection records'],
    alternatives: ['Normal starting transients', 'Changing air demand', 'Upstream event definition or measurement error'],
    verification_steps: ['Compare event current with the motor nameplate and operating state.', 'Review controller protection records with qualified maintenance personnel under existing procedures.'],
    source_refs: ['diagram', 'atlas_g'],
  },
  {
    id: 'cooling_heat_rejection', kind: 'candidate_hypothesis', triggers: ['thermal_events', 'temperature_rise'],
    components: ['oil cooler', 'compressed-air aftercooler', 'installed cooling circuit'],
    possible_cause: 'Cooling or heat-rejection contribution',
    mechanism: 'Reduced heat rejection can contribute to temperature elevation; the relevant cooler depends on sensor location and the installed cooling arrangement.',
    evidence_needed: ['Temperature sensor location and applicable limits', 'Comparable operating load and ambient conditions', 'Cooling-medium conditions and cooler inspection'],
    alternatives: ['Higher load', 'Higher ambient temperature', 'Sensor placement or calibration', 'Lubrication-related temperature change'],
    verification_steps: ['Locate the temperature sensor and compare repeat readings at similar load.', 'Inspect the relevant cooler and cooling supply for the installed air- or water-cooled configuration.'],
    source_refs: ['diagram', 'atlas_g'],
  },
  {
    id: 'lubrication_flow_condition', kind: 'candidate_hypothesis', triggers: ['thermal_events', 'temperature_rise'],
    components: ['oil filter', 'lubrication circuit', 'compressor element'],
    possible_cause: 'Lubrication condition or circulation contribution',
    mechanism: 'Oil condition or restricted circulation can contribute to thermal changes. An oil filter filters oil; cooling is a separate oil-cooler function.',
    evidence_needed: ['Oil level, condition and maintenance records', 'Applicable oil specification', 'Filter differential or OEM inspection findings'],
    alternatives: ['Cooling limitation', 'Operating-load change', 'Sensor error'],
    verification_steps: ['Check oil condition, level and service records using the applicable manual.', 'Check filter/circulation evidence before attributing a restriction or prescribing replacement.'],
    source_refs: ['diagram', 'atlas_g'],
  },
  {
    id: 'mechanical_vibration_contribution', kind: 'candidate_hypothesis', triggers: ['axis_vibration_rise'],
    components: ['electric drive motor', 'compressor element', 'mounting / installed transmission'],
    possible_cause: 'Mechanical or mounting contribution to vibration',
    mechanism: 'Increasing comparable axis RMS readings can warrant mechanical verification. They do not distinguish mounting, imbalance, alignment or bearing defects.',
    evidence_needed: ['Sensor mounting, units and measurement bandwidth', 'Comparable load and speed', 'Vibration spectrum / enveloped acceleration and field inspection'],
    alternatives: ['Changed load or speed', 'Sensor mounting change', 'External vibration'],
    verification_steps: ['Repeat vibration measurements at equivalent load and verify sensor mounting.', 'Use spectrum analysis and appropriate field checks to distinguish motor, element and mounting sources.'],
    source_refs: ['diagram', 'skf_vibration'],
  },
  {
    id: 'vibration_measurement_verification', kind: 'verification_only', triggers: ['vibration_snapshot'],
    components: ['vibration measurement', 'motor / compressor measurement positions'],
    possible_cause: null,
    mechanism: 'A snapshot can support a measurement plan; it cannot establish a trend or a specific mechanical fault.',
    evidence_needed: ['Documented units, sensor position and timestamp', 'Comparable operating baseline', 'Applicable alarm criteria'],
    alternatives: [],
    verification_steps: ['Verify vibration units and mounting, then collect a comparable operating baseline.', 'Investigate persistent deviations using repeat measurements and spectrum analysis.'],
    source_refs: ['skf_vibration'],
  },
  {
    id: 'thermal_measurement_verification', kind: 'verification_only', triggers: ['thermal_measurement'],
    components: ['temperature measurement'], possible_cause: null,
    mechanism: 'A thermal rate does not identify an absolute temperature; absolute readings need sensor location and applicable limits for severity assessment.',
    evidence_needed: ['Absolute temperature where currently absent', 'Sensor position and documented limits'],
    alternatives: [],
    verification_steps: ['Identify the thermal measurement location and confirm the applicable temperature limits.', 'Obtain an absolute temperature reading if only a rate is available.'],
    source_refs: ['diagram'],
  },
  {
    id: 'measurement_event_alignment', kind: 'verification_only', triggers: ['unverified_snapshot', 'missing_sensor'],
    components: ['telemetry measurement', 'controller event records'], possible_cause: null,
    mechanism: 'Missing or unverified measurements require evidence collection; they are not a sensor-failure diagnosis.',
    evidence_needed: ['Measurement timestamps with explicit timezone', 'Synchronized sensor and controller event records'],
    alternatives: [],
    verification_steps: ['Confirm sensor timestamps and obtain missing measurements.', 'Align current, temperature, vibration and controller events before correlating fault mechanisms.'],
    source_refs: ['diagram'],
  },
];
