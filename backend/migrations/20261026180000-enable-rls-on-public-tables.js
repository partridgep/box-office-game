'use strict';

/**
 * Lock down Supabase Data API access for tables used only via Sequelize/Postgres.
 *
 * Enabling RLS with no policies denies anon/authenticated through PostgREST.
 * Revoking grants is belt-and-suspenders so the API cannot reach these tables
 * even if policies are added later by mistake.
 *
 * Direct Postgres (SUPABASE_DATABASE_URL / table owner) is unaffected.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = await listPublicBaseTables(queryInterface);

    for (const table of tables) {
      const ident = quoteIdent(table);
      await queryInterface.sequelize.query(
        `ALTER TABLE public.${ident} ENABLE ROW LEVEL SECURITY`
      );
      await queryInterface.sequelize.query(
        `REVOKE ALL ON TABLE public.${ident} FROM anon, authenticated`
      );
    }
  },

  async down(queryInterface) {
    const tables = await listPublicBaseTables(queryInterface);

    for (const table of tables) {
      const ident = quoteIdent(table);
      await queryInterface.sequelize.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.${ident} TO anon, authenticated`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE public.${ident} DISABLE ROW LEVEL SECURITY`
      );
    }
  },
};

async function listPublicBaseTables(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> 'SequelizeMeta'
    ORDER BY c.relname
  `);

  return rows.map((row) => row.table_name);
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}
