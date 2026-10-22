import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

async function loadAlerts() {
  const bundled = await build({
    entryPoints: ['src/modules/management/components/ActiveAlertsCard.tsx'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    logLevel: 'silent',
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(
    module, module.exports, createRequire(import.meta.url)
  );
  return module.exports.getManagementAlerts;
}

test('CNC and Robo alerts use selected-range utilization while compressor alerts retain their rules', async () => {
  const getManagementAlerts = await loadAlerts();
  const summary = {
    availability: 86.4,
    avg_utilization: 90,
    high_temperature_events: 0,
    maximum_temperature: 75,
    trip_count: 0,
    restart_count: 0,
    mtbi_seconds: 0,
    downtime_seconds: 0,
    average_temperature_fall: 0,
  };

  assert.deepEqual(getManagementAlerts(summary, [], true, 27.5), [{
    title: 'Availability vs Utilization',
    message: 'Availability is 86.4% but utilization is 27.5%.',
    severity: 'MEDIUM',
  }]);
  assert.deepEqual(getManagementAlerts(summary, [], false, 27.5), []);
  assert.equal(getManagementAlerts({ ...summary, maximum_temperature: 96 }, [], false)[0].title, 'High Temperature');
});
