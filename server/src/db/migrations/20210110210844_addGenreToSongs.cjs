/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => {
  return knex.schema.createTable("songs", (table) => {
    table.bigIncrements("id").primary()
    table.string("name").notNullable()
    table.string("artist")
    table.string("album")
    table.integer("songNumber")
  })
};
/**
 * @param {Knex} knex
 */
exports.down = function (knex) {};
