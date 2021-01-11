// eslint-disable-next-line import/no-extraneous-dependencies
const ObjectionModel = require("objection").Model;

/**
 *
 * @class Model
 */
class Model extends ObjectionModel {
  $beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }
}

module.exports = Model;
