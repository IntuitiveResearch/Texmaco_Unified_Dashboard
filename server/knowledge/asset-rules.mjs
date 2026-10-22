import { COMPRESSOR_RULES, KNOWLEDGE_SOURCES as COMPRESSOR_SOURCES, KNOWLEDGE_VERSION as COMPRESSOR_VERSION } from './compressor-rules.mjs';

export const ASSET_KNOWLEDGE_VERSION = 'multi-asset-knowledge-v1';

export const ASSET_KNOWLEDGE_SOURCES = {
  ...COMPRESSOR_SOURCES,
  gantry_cnc: {
    title: 'Heavy Industrial Gantry Cutting Systems Engineering Guide',
    kind: 'generic_equipment_reference',
    url: null,
    scope: 'Supports oxy-fuel & plasma gantry mechanisms, torch consumable wear patterns, gas regulation, and CNC rail maintenance.',
  },
  robotic_welding: {
    title: 'Robotic Arc Welding Engineering Manual',
    kind: 'generic_equipment_reference',
    url: null,
    scope: 'Supports automated robotic MIG/MAG welding cell kinematics, wire feed dynamics, torch maintenance, and shielding gas delivery.',
  },
};

export const CNC_RULES = [
  {
    id: 'cnc_idle_handling_bottleneck',
    kind: 'candidate_hypothesis',
    triggers: ['high_idle_ratio', 'low_utilization'],
    components: ['cutting bed', 'material handling crane', 'CNC nesting controller'],
    possible_cause: 'Plate staging, nesting or setup delay',
    mechanism: 'Disproportionate idle duration relative to cutting time indicates plate loading delays, alignment verification, or nesting queue holds rather than machine failure.',
    evidence_needed: ['Daily idle vs runtime ratio', 'Material handling crane dispatch logs', 'Operator job setup records'],
    alternatives: ['Drawing / nesting revision hold', 'Shift break or plate thickness changeover', 'Machine waiting on material supply'],
    verification_steps: ['Review machine idle intervals against plate loading logs.', 'Verify nesting job sequencing and plate alignment turnaround times.'],
    source_refs: ['gantry_cnc'],
  },
  {
    id: 'cnc_torch_consumable_wear',
    kind: 'candidate_hypothesis',
    triggers: ['cycle_interruption', 'cycle_count_drop'],
    components: ['cutting torch assembly', 'cutting nozzle / tip', 'torch height controller (THC)'],
    possible_cause: 'Torch consumable degradation or pierce retry hold',
    mechanism: 'Worn cutting nozzles, slag spatter accumulation, or orifice deformation cause pierce failures and arc/flame cut retries, increasing downtime between cutting cycles.',
    evidence_needed: ['Cycle count drop against operating hours', 'Visual inspection of torch nozzle and electrode condition', 'Gas delivery pressure stability'],
    alternatives: ['Dirty or wet cutting gas supply', 'Thicker material plate trial', 'Incorrect pierce height setting'],
    verification_steps: ['Inspect torch cutting nozzle, swirl ring, and shield cap for spatter or erosion.', 'Measure gas delivery pressures under active flow conditions during torch ignition.'],
    source_refs: ['gantry_cnc'],
  },
  {
    id: 'cnc_drive_motion_resistance',
    kind: 'candidate_hypothesis',
    triggers: ['extended_downtime'],
    components: ['gantry longitudinal rails', 'rack and pinion drive', 'cable drag chain'],
    possible_cause: 'Gantry drive rail friction or motion stop',
    mechanism: 'Accumulated cutting dust, slag particulates, or dry guide rails increase rack-and-pinion resistance, potentially tripping drive servo overcurrent limits or collision sensors.',
    evidence_needed: ['Downtime event logs', 'Rail lubrication inspection logs', 'Gantry drive motor error codes'],
    alternatives: ['Emergency stop push button activation', 'Sheet collision sensor trip on plate tilt', 'Scheduled mechanical PM hold'],
    verification_steps: ['Clean and wipe longitudinal gantry rails and pinions; verify automatic oiler lubrication delivery.', 'Check torch crash protection sensor alignment and limit switch actuation.'],
    source_refs: ['gantry_cnc'],
  },
  {
    id: 'cnc_general_verification',
    kind: 'verification_guidance',
    triggers: ['unverified_snapshot', 'missing_sensor'],
    components: ['CNC control console', 'gas manifold pressure gauges'],
    possible_cause: 'Telemetry observation requires field verification',
    mechanism: 'Process parameters must be cross-checked against standard cutting chart tables for plate thickness and material grade.',
    evidence_needed: ['Physical gas regulator gauges', 'Cutting speed and THC voltage display', 'Machine control event log'],
    alternatives: ['Uncalibrated gas gauge', 'Sensor transmission delay'],
    verification_steps: ['Check cutting oxygen and fuel/plasma gas pressure at the machine regulator manifold.', 'Inspect THC initial height sensing and torch collision ring.'],
    source_refs: ['gantry_cnc'],
  },
];

export const ROBO_RULES = [
  {
    id: 'robo_fixture_clamping_bottleneck',
    kind: 'candidate_hypothesis',
    triggers: ['high_idle_ratio', 'low_utilization'],
    components: ['workpiece positioner / jig fixture', 'safety enclosure / light curtains', 'cell control PLC'],
    possible_cause: 'Part loading, manual tacking, or fixture turnaround delay',
    mechanism: 'Low arc-on time compared to cell runtime typically stems from manual component fitting, clamping adjustments, or tacking delays outside the automated robot envelope.',
    evidence_needed: ['Cell runtime vs arc-on utilization %', 'Tacking station buffer supply', 'Operator cycle start log'],
    alternatives: ['Waiting on raw material stamping', 'Part dimensional fit-up variations', 'Batch changeover'],
    verification_steps: ['Audit part changeover and fixture clamping duration across active shifts.', 'Ensure sub-assemblies arrive pre-tacked to specification before robot cell loading.'],
    source_refs: ['robotic_welding'],
  },
  {
    id: 'robo_wire_feed_and_tip_wear',
    kind: 'candidate_hypothesis',
    triggers: ['cycle_interruption', 'cycle_count_drop'],
    components: ['wire feed drive unit', 'contact tip', 'torch cable assembly / liner'],
    possible_cause: 'Wire feeder slip, liner friction, or contact tip wear',
    mechanism: 'Deformed contact tips, spatter bridging, or dirty wire feed liners cause micro-arcing and feed hesitations, leading to arc extinction and cycle stops.',
    evidence_needed: ['Daily cycle count trajectory', 'Wire spool remaining weight', 'Torch contact tip condition'],
    alternatives: ['Poor weld ground clamp contact', 'MIG shielding gas coverage drop', 'Robotic arc start retry timeout'],
    verification_steps: ['Inspect contact tip wear and bore ovality; replace if diameter exceeds wire tolerance.', 'Check wire feeder drive roll tension, guide tube alignment, and liner cleanliness.'],
    source_refs: ['robotic_welding'],
  },
  {
    id: 'robo_nozzle_cleaning_and_gas_coverage',
    kind: 'candidate_hypothesis',
    triggers: ['extended_downtime'],
    components: ['torch gas nozzle', 'torch reamer / cleaning station', 'shielding gas solenoid'],
    possible_cause: 'Nozzle spatter accumulation or cleaning cycle fault',
    mechanism: 'Failure of automated mechanical reaming or anti-spatter spraying allows heavy weld spatter build-up inside the nozzle, blocking gas laminar flow and causing robot faults.',
    evidence_needed: ['Downtime duration and frequency', 'Reamer station maintenance condition', 'Torch gas shroud visual inspection'],
    alternatives: ['Shielding gas cylinder empty or low line pressure', 'Robot torch collision detection sensor tripped', 'Safety gate interlock tripped'],
    verification_steps: ['Inspect the robotic torch reamer station for blade sharpness and clamping operation.', 'Check gas nozzle interior and verify gas flow rate (15-20 L/min) using a shroud flow meter.'],
    source_refs: ['robotic_welding'],
  },
  {
    id: 'robo_general_verification',
    kind: 'verification_guidance',
    triggers: ['unverified_snapshot', 'missing_sensor'],
    components: ['robot teach pendant', 'welding power source console'],
    possible_cause: 'Telemetry observation requires field verification',
    mechanism: 'Telemetry snapshots reflect high-level cell states; welding voltage, current, and wire speed should be confirmed at the power source controller.',
    evidence_needed: ['Power source program display', 'Robot TCP check pointer', 'Gas flow meter reading'],
    alternatives: ['Console setting adjustment', 'Sensor transmission delay'],
    verification_steps: ['Inspect welding power source front panel for programmed vs actual current/voltage.', 'Verify robot tool center point (TCP) against the reference calibration pin.'],
    source_refs: ['robotic_welding'],
  },
];

export { COMPRESSOR_RULES, COMPRESSOR_SOURCES, COMPRESSOR_VERSION };
