const assert = require('better-assert');

const trim = require('trim');

const {
  modelNameToForeignKey,
  modelNameToAs,
  hasMany,
  belongsTo,
  belongsToMany
} = require('./AssociationsParser-hooks.js');

class AssociationsParser {
  constructor(options) {
    assert(options);
    assert(options.sequelize);
    assert(options.models);

    const logger = options.logger || console;
    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('ASSOCIATION-PARSER');
    } else {
      this.logger = logger;
    }

    this.sequelize = options.sequelize;
    this.models = options.models;
    this.hook = {
      modelNameToForeignKey: options.hook && options.hook.modelNameToForeignKey || modelNameToForeignKey,
      modelNameToAs: options.hook && options.hook.modelNameToAs || modelNameToAs,
      hasMany: options.hook && options.hook.hasMany || hasMany,
      belongsTo: options.hook && options.hook.belongsTo || belongsTo,
      belongsToMany: options.hook && options.hook.belongsToMany || belongsToMany
    };
  }

  /*
   * @param infos Object  srcModelName, dstModelName, dstAs, other params.
   */
  _createHasManyAssociation(infos) {
    assert(infos);
    assert(infos.srcModelName);
    assert(infos.dstModelName);
    assert(infos.dstAs);

    const srcModel = this.models[infos.srcModelName];
    const dstModel = this.models[infos.dstModelName];
    const dstAs = infos.dstAs;
    const foreignKey = infos.foreignKey || this.hook.modelNameToForeignKey(infos.srcModelName);

    if (typeof srcModel === 'undefined') {
      throw new Error(`unknown model ${infos.srcModelName}`);
    }
    if (typeof dstModel === 'undefined') {
      throw new Error(`unknown model ${infos.dstModelName}`);
    }
    // new info object
    infos = Object.assign({}, infos, {
      srcModel: srcModel,
      dstModel: dstModel,
      dstAs: dstAs,
      foreignKey: foreignKey
    });

    this.logger.log(`${infos.srcModelName}.hasMany(${infos.dstModelName}, {as: ${dstAs}, foreignKey:${foreignKey}}, ...)`);
    // we let the ability to hook this call.
    return this.hook.hasMany(infos);
  }

  _createBelongsToAssociation(infos) {
    assert(infos);
    assert(infos.srcModelName);
    assert(infos.dstModelName);

    const srcModel = this.models[infos.srcModelName];
    const dstModel = this.models[infos.dstModelName];
    const dstAs = infos.dstAs || modelNameToAs(infos.dstModelName);
    const constraints = infos.constraints || false;
    const foreignKey = infos.foreignKey || undefined;
    const targetKey = infos.targetKey || undefined;

    if (typeof srcModel === 'undefined') {
      throw new Error(`unknown model ${infos.srcModelName}`);
    }
    if (typeof dstModel === 'undefined') {
      throw new Error(`unknown model ${infos.dstModelName}`);
    }
    // new info object
    infos = Object.assign({}, infos, {
      srcModel: srcModel,
      dstModel: dstModel,
      dstAs: dstAs,
      foreignKey: foreignKey,
      constraints: constraints
    });

    this.logger.log(`${infos.srcModelName}.belongsTo(${infos.dstModelName}, {as: ${dstAs}, constraints: ${constraints}, foreignKey:${foreignKey}, targetKey:${targetKey}})`);
    // we let the ability to hook this call.
    return this.hook.belongsTo(infos);
  }

  _createBelongsToManyAssociation(infos) {
    assert(infos);
    assert(infos.srcModelName);
    assert(infos.dstModelName);
    assert(infos.liaisonModelName);
    assert(infos.dstAs);

    const srcModel = this.models[infos.srcModelName];
    const dstModel = this.models[infos.dstModelName];
    const liaisonModel = this.models[infos.liaisonModelName];
    const dstAs = infos.dstAs;
    const foreignKey = infos.foreignKey || this.hook.modelNameToForeignKey(infos.srcModelName);

    if (typeof srcModel === 'undefined') {
      throw new Error(`unknown model ${infos.srcModelName}`);
    }
    if (typeof dstModel === 'undefined') {
      throw new Error(`unknown model ${infos.dstModelName}`);
    }
    if (typeof liaisonModel === 'undefined') {
      throw new Error(`unknown model ${infos.liaisonModelName}`);
    }
    // new info object
    infos = Object.assign({}, infos, {
      srcModel: srcModel,
      dstModel: dstModel,
      liaisonModel: liaisonModel,
      dstAs: dstAs,
      foreignKey: foreignKey
    });

    this.logger.log(`${infos.srcModelName}.belongsToMany(${infos.dstModelName}, {through: ${infos.liaisonModelName}, as: ${dstAs}, foreignKey:${foreignKey}})`);
    // we let the ability to hook this call.
    return this.hook.belongsToMany(infos);
  }

  _parseLine(line) {
    const parts = line.split('->').map(p => trim(p));
    // parsing options, right of last part
    let [lastPart, options] = parts.pop().split(/\s+/);
    if (options) {
      options = options.split(',').reduce((p, c) => {
        const [ key, val ] = c.split(':');
        if (!key || !val) {
          throw new Error('malformed line ending options '+options);
        }
        p[key] = val;
        return p;
      }, {});
    }
    // pushing back the last part
    parts.push(lastPart);

    // ensure number of parts is correct
    if (parts.length < 2 || parts.length > 3) {
      throw new Error(`malformed line ${line}`);
    }

    //
    if (parts.length === 2) {
      const [left, right] = parts;
      const hasMany = left.endsWith("[]");
      if (hasMany) {
        // hasMany
        const [srcModelName, dstAs] = left.split('.');
        const dstModelName = right;
        const infos = Object.assign({
          srcModelName: srcModelName,
          dstModelName: dstModelName,
          dstAs: dstAs.replace('[]', '')
        }, options);
        return this._createHasManyAssociation(infos);
      } else {
        // belongsTo
        const [srcModelName, dstAs] = left.split('.');
        const dstModelName = right;
        const infos = Object.assign({
          srcModelName: srcModelName,
          dstModelName: dstModelName,
          dstAs: dstAs
        }, options);
        return this._createBelongsToAssociation(infos);
      }
    } else {
      // belongsToMany
      const [left, middle, right] = parts;
      const [srcModelName, dstAs] = left.split('.');
      const infos = Object.assign({
        srcModelName: srcModelName,
        dstModelName: right,
        liaisonModelName: middle,
        dstAs: dstAs.replace('[]', '')
      }, options);
      return this._createBelongsToManyAssociation(infos);
    }
  }

  /**
   * @param associations string    DSL describing associations
   * @return Map(Model, [ { model: Model, as: "..." } ])
   */
  parse(associations) {
    assert(typeof associations === 'string' && associations);

    const result = new Map();

    this.logger.log(`ASSOCIATIONS=${associations}`);

    associations.split("\n").forEach((line, i) => {
      const trimedLine = trim(line);
      if (trimedLine.length === 0 ||
          trimedLine[0] === '#' ||
          trimedLine[0] === '`') { // markdown ;)
        // comment
        return;
      }
      try {
        const infos = this._parseLine(trimedLine);

        this.logger.log(`[OK]: ${line}`);
        if (!result.has(infos.srcModel)) {
          result.set(infos.srcModel, []);
        }
        const modelLiaisons = result.get(infos.srcModel);
        modelLiaisons.push({
          as: infos.dstAs,
          model: infos.dstModel
        });
      } catch (err) {
        this.logger.error(`[KO]: ${err.message} \n line ${i}: ${line}`);
        throw err;
      }
    });
    return result;
  }
}


module.exports = AssociationsParser;
