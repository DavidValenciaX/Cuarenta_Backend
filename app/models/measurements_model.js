const pool = require('../config/data_base');

class Measurement {
  static async getAllMeasurementTypes() {
    const query = `
      SELECT 
        mt.id AS type_id,
        mt.name AS type_name,
        mt.description AS type_description,
        uom.id AS unit_id,
        uom.name AS unit_name,
        uom.symbol AS unit_symbol
      FROM 
        measurement_types mt
      LEFT JOIN 
        units_of_measure uom ON mt.id = uom.measurement_type_id
      ORDER BY 
        mt.id, uom.id
    `;

    const { rows } = await pool.query(query);
    
    // Structure data as in the example
    const typesMap = new Map();
    
    rows.forEach(row => {
      if (!typesMap.has(row.type_id)) {
        typesMap.set(row.type_id, {
          id: row.type_id,
          name: row.type_name,
          description: row.type_description,
          units_of_measure: []
        });
      }
      
      if (row.unit_id) {
        typesMap.get(row.type_id).units_of_measure.push({
          id: row.unit_id,
          name: row.unit_name,
          symbol: row.unit_symbol
        });
      }
    });
    
    return Array.from(typesMap.values());
  }
}

module.exports = Measurement;
