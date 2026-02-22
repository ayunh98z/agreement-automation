// Lightweight helper exported for compatibility with UVAgreement imports
export function buildCollateralPayload(form = {}) {
  const f = form || {};
  const out = {
    contract_number: f.contract_number || undefined,
    wheeled_vehicle: f.wheeled_vehicle || undefined,
    vehicle_types: f.vehicle_types || f.vehicle_type || undefined,
    vehicle_type: f.vehicle_type || f.vehicle_types || undefined,
    vehicle_brand: f.vehicle_brand || undefined,
    vehicle_model: f.vehicle_model || undefined,
    vechile_model: f.vehicle_model || undefined,
    plate_number: f.plate_number || f.plat_number || undefined,
    plat_number: f.plat_number || f.plate_number || undefined,
    chassis_number: f.chassis_number || undefined,
    engine_number: f.engine_number || undefined,
    manufactured_year: f.manufactured_year || undefined,
    colour: f.colour || undefined,
    vehicle_colour: f.colour || f.vehicle_colour || undefined,
    bpkb_number: f.bpkb_number || undefined,
    name_bpkb_owner: f.name_bpkb_owner || undefined
  };
  Object.keys(out).forEach(k => {
    const v = out[k];
    if (v === undefined) delete out[k];
    else if (typeof v === 'string' && v.trim() === '') delete out[k];
    else if (v === null) delete out[k];
  });
  return out;
}
