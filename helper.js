const assert = require('better-assert');

const fs = require('fs');

const AssociationsParser = require('./AssociationsParser.js');
const QueryOptionsBuilder = require('./QueryOptionsBuilder.js');

class Helper {
  constructor(options) {
    assert(options);
    assert(options.sequelize);

    const logger = options.logger || console;
    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('SEQUELIZE-HELPER');
    } else {
      this.logger = logger;
    }
    this.sequelize = options.sequelize;
    this.models = { /*modelName: Model*/ };
    this.associations = null;
  }

  //
  loadModelsFromDirectory(dirname) {
    assert(typeof dirname === 'string');
    assert(dirname);

    this.logger.log(`Load models from directory ${dirname}`);
    const files = fs.readdirSync(dirname);
    files.forEach(file => {
      const modelName = file.replace('.js', '');
      this.logger.log(`load model ${modelName}`);
      this.models[modelName] = this.sequelize.import(dirname+'/'+file);
    });
    return this.models;
  }

  getModels(regex) {
    assert(regex instanceof RegExp);

    return Object.keys(this.models)
      .filter(modelName => modelName.match(regex))
      .reduce((p, modelName) => {
        p[modelName] = this.models[modelName];
        return p;
      }, {});
  }

  createQueryOptionsBuilder(options) {
    options = Object.assign({helper:this}, options);
    return new QueryOptionsBuilder(options);
  }

  createQueryOptionsFilter(options) {
    return options; // FIXME
  }

  /*
   * FIXME: documentation
   * @return Map(Model, [ { model: Model, as: "..." } ])
   */
  associateModels(associations) {
    assert(typeof associations === 'string');
    assert(associations);

    const parser = new AssociationsParser({
      sequelize: this.sequelize,
      models: this.models,
      logger: this.logger
    });
    this.associations = parser.parse(associations);
  }

  generateOptionalAssociations() {
    assert(this.associations instanceof Map);

    const result = new Map();
    for (const [modelName, associations] of this.associations) {
      result.set(modelName, associations.map(association => {
        return {
          model: association.model,
          as: association.as,
          required: false
        };
      }));
    }
    return result;
  }
}

module.exports = Helper;
