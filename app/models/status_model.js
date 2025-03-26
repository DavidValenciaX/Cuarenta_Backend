const pool = require('../config/data_base');

class Status {
  static async getAllStatusWithCategories() {
    const query = `
      SELECT 
        sc.id AS category_id,
        sc.name AS category_name,
        sc.description AS category_description,
        st.id AS type_id,
        st.name AS type_name,
        st.description AS type_description
      FROM 
        status_categories sc
      LEFT JOIN 
        status_types st ON sc.id = st.category_id
      ORDER BY 
        sc.id, st.id
    `;

    const { rows } = await pool.query(query);
    
    // Structure data as in the example
    const categoriesMap = new Map();
    
    rows.forEach(row => {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          status_types: []
        });
      }
      
      if (row.type_id) {
        categoriesMap.get(row.category_id).status_types.push({
          id: row.type_id,
          name: row.type_name,
          description: row.type_description
        });
      }
    });
    
    return Array.from(categoriesMap.values());
  }
}

module.exports = Status;
