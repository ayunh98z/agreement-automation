// Helper to build collateral payloads for different agreement types (BL vs UV)
export function buildCollateralPayload(form = {}, type = 'uv') {
  // Normalize input
  const f = form || {};
  if (type === 'uv') {
    // UV collateral: prefer vehicle-specific keys, DO NOT include `collateral_type`
    const out = {
      contract_number: f.contract_number || undefined,
      wheeled_vehicle: f.wheeled_vehicle || undefined,
      vehicle_types: f.vehicle_types || f.vehicle_type || undefined,
      vehicle_type: f.vehicle_type || f.vehicle_types || undefined,
      vehicle_brand: f.vehicle_brand || undefined,
      vehicle_model: f.vehicle_model || undefined,
      // backend historically contains some misspelled/alternate column names;
      // include aliases so INSERT/UPDATE maps correctly regardless of schema
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
    // remove empty/undefined string fields to avoid inserting '' -> 0 on numeric PK
    Object.keys(out).forEach(k => {
      const v = out[k];
      if (v === undefined) delete out[k];
      else if (typeof v === 'string' && v.trim() === '') delete out[k];
      else if (v === null) delete out[k];
    });
    return out;
  }

  // Default / BL: include general collateral_type and common fields, omit vehicle-specific typos
  return {
    contract_number: f.contract_number || undefined,
    collateral_type: f.collateral_type || f.vechile_types || f.vehicle_types || undefined,
    number_of_certificate: f.number_of_certificate || '',
    number_of_ajb: f.number_of_ajb || '',
    surface_area: f.surface_area || '',
    name_of_collateral_owner: f.name_of_collateral_owner || '',
    capacity_of_building: f.capacity_of_building || '',
    location_of_land: f.location_of_land || ''
  };
}

export default buildCollateralPayload;
