import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

async function loadFinanceApi() {
  const bundled = await build({
    entryPoints: ['src/modules/finance/services/api.ts'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    logLevel: 'silent',
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(
    module,
    module.exports,
    createRequire(import.meta.url)
  );
  return module.exports;
}

test('mapInputAssumptionsToState maps API input_assumptions correctly into financial assumptions state', async () => {
  const { mapInputAssumptionsToState } = await loadFinanceApi();

  const apiInputAssumptions = {
    downtime_cost_per_hour: 25000,
    maintenance_event_count: 4,
    average_production_value: 50000,
    average_spares_labour_cost: 20000,
    average_maintenance_cost: 25000,
    electricity_tariff: 9,
  };

  const mapped = mapInputAssumptionsToState(apiInputAssumptions);

  const getById = (id) => mapped.find((item) => item.id === id);

  const tariff = getById('tariff');
  assert.equal(tariff.rawNumber, 9);
  assert.equal(tariff.value, '₹ 9 / kWh');

  const prod = getById('production_value');
  assert.equal(prod.rawNumber, 50000);
  assert.equal(prod.value, '₹ 50,000 / hour');

  const downtime = getById('downtime_cost');
  assert.equal(downtime.rawNumber, 25000);
  assert.equal(downtime.value, '₹ 25,000 / hour');

  const maintCost = getById('maint_event_cost');
  assert.equal(maintCost.rawNumber, 25000);
  assert.equal(maintCost.value, '₹ 25,000 / event');

  const spares = getById('spares_cost');
  assert.equal(spares.rawNumber, 20000);
  assert.equal(spares.value, '₹ 20,000 / event');

  const events = getById('maint_events');
  assert.equal(events.rawNumber, 4);
  assert.equal(events.value, '4 / month');

  const operatingHours = getById('operating_hours');
  assert.equal(operatingHours.rawNumber, 720);
  assert.equal(operatingHours.value, '720 hours / month');
});

test('mapInputAssumptionsToState handles null/undefined safely and returns baseline', async () => {
  const { mapInputAssumptionsToState } = await loadFinanceApi();

  const baselineNull = mapInputAssumptionsToState(null);
  assert.ok(Array.isArray(baselineNull));
  assert.equal(baselineNull.length, 7);

  const baselineUndef = mapInputAssumptionsToState(undefined);
  assert.ok(Array.isArray(baselineUndef));
  assert.equal(baselineUndef.length, 7);
});

test('mapFinancialIntelToDashboardData attaches inputAssumptions to PlantData', async () => {
  const { mapFinancialIntelToDashboardData } = await loadFinanceApi();

  const rawApiResponse = {
    asset: 'MACHINE#PI4G/TXMMIGI/26001',
    asset_type: 'welder',
    input_assumptions: {
      downtime_cost_per_hour: 25000,
      maintenance_event_count: 4,
      average_production_value: 50000,
      average_spares_labour_cost: 20000,
      average_maintenance_cost: 25000,
      electricity_tariff: 9,
    },
    period: {
      range: '1m',
      start_date: '2026-09-01',
      end_date: '2026-10-01',
      selected_days: 30,
      data_days: 30,
      data_complete: true,
      calculation_days: 30,
    },
    operational: {
      records_found: 100,
      data_days: 30,
      downtime_hours: 12.5,
      unloaded_hours: 5.0,
      idle_hours: 5.0,
      financial_unproductive_hours: 5.0,
      financial_unproductive_type: 'idle',
    },
    financial_exposure: {
      downtime_cost: 312500,
      energy_waste_kwh: 1200,
      energy_waste_cost: 10800,
      idle_unproductive_cost: 45000,
      maintenance_cost: 100000,
      production_capacity_opportunity: 625000,
      total_exposure: 468300,
    },
    cost_distribution: [],
    saving_opportunities: [],
    financial_exposure_trend: [],
  };

  const dashboardData = mapFinancialIntelToDashboardData(rawApiResponse, 'Robo Welder');
  assert.ok(dashboardData.inputAssumptions);
  assert.equal(dashboardData.inputAssumptions.electricity_tariff, 9);
  assert.equal(dashboardData.inputAssumptions.downtime_cost_per_hour, 25000);
});
