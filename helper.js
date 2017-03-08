const assert = require('better-assert');

const Q = require('q');

const trim = require('trim');

const fs = require('fs');

const AssociationParser = require('./associations.parser.js');

class Helper {
  constructor(options) {
    assert(options);
    assert(options.sequelize);

    const logger = options.logger || console;
    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('SEQUELIZE-HELPER');
    }
    this.sequelize = options.sequelize;
    this.models = { /*modelName: Model*/ };
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

  /*
   * @param associations string
   *
   * string format:
   * modelA.as -> modelB key:val key:val ...
   * modelA ->
   */
  associateModels(associations, options) {
    assert(typeof associations === 'string');
    assert(associations);

    const parser = new AssociationParser({
      sequelize: this.sequelize,
      models: this.models,
      logger: this.logger
    });
    parser.parse(associations);
  }
}

module.exports = Helper;
