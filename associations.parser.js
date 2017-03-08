const assert = require('better-assert');

const trim = require('trim');

function modelNameToForeignKey(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1) + 'Id';
}

function modelNameToAs(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

class AssociationParser {
  constructor(options) {
    assert(options);
    assert(options.sequelize);
    assert(options.models);

    const logger = options.logger || console;
    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('ASSOCIATION-PARSER');
    }
    this.sequelize = options.sequelize;
    this.models = options.models;
    this.hook = {
      modelNameToForeignKey: options.hook && options.hook.modelNameToForeignKey || modelNameToForeignKey,
      modelNameToAs: options.hook && options.hook.modelNameToAs || modelNameToAs
    }
  }

  _createHasManyAssociation(infos) {
    assert(infos);
    assert(infos.srcModelName);
    assert(infos.dstModelName);
    assert(infos.dstAs);

    const srcModel = this.models[infos.srcModelName];
    const dstModel = this.models[infos.dstModelName];
    const dstAs = infos.dstAs;
    const foreignKey = infos.foreignKey || this.hook.modelNameToForeignKey(infos.srcModelName)

    if (typeof srcModel === 'undefined') {
      throw new Error(`unknown model ${infos.srcModelName}`);
    }
    if (typeof dstModel === 'undefined') {
      throw new Error(`unknown model ${infos.dstModelName}`);
    }
    this.logger.log(`${infos.srcModelName}.hasMany(${infos.dstModelName}, {as: ${dstAs}, foreignKey:${foreignKey}})`);
    srcModel.hasMany(dstModel, {as: dstAs, foreignKey:foreignKey});
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

    if (typeof srcModel === 'undefined') {
      throw new Error(`unknown model ${infos.srcModelName}`);
    }
    if (typeof dstModel === 'undefined') {
      throw new Error(`unknown model ${infos.dstModelName}`);
    }
    this.logger.log(`${infos.srcModelName}.belongsTo(${infos.dstModelName}, {as: ${dstAs}, constraints: ${constraints}, foreignKey:${foreignKey}})`);
    srcModel.belongsTo(dstModel, {as: dstAs, constraints:constraints, foreignKey:foreignKey});
  }

  _createBelongsToManyAssociation(infos) {
    assert(infos);
    assert(infos.srcModelName);
    assert(infos.dstModelName);
    assert(infos.liaisonModelName);
    assert(infos.dstAs);

    const srcModel = this.models[infos.srcModelName];
    const dstModel = this.models[infos.dstModelName];
    const liaiasonModel = this.models[infos.liaisonModelName];
    const dstAs = infos.dstAs;
    const foreignKey = infos.foreignKey || this.hook.modelNameToForeignKey(infos.srcModelName);

    if (typeof srcModel === 'undefined') {
      throw new Error(`unknown model ${infos.srcModelName}`);
    }
    if (typeof dstModel === 'undefined') {
      throw new Error(`unknown model ${infos.dstModelName}`);
    }
    if (typeof liaiasonModel === 'undefined') {
      throw new Error(`unknown model ${infos.liaisonModelName}`);
    }
    this.logger.log(`${infos.srcModelName}.belongsToMany(${infos.dstModelName}, {through: ${infos.liaisonModelName}, as: ${dstAs}, foreignKey:${foreignKey}})`);
    srcModel.belongsToMany(dstModel, {through: liaiasonModel, as: dstAs, foreignKey: foreignKey});
  }

  _parseLine(line) {
    const parts = line.split('->').map(p=>trim(p));
    // parsing options, right of last part
    const [lastPart, options] = parts.pop().split(/\s+/);
    parts.push(lastPart); // pushing back the last part

    // ensure number of parts is correct
    if (parts.length < 2 || parts.length > 3) {
      throw new Error(`malformed line ${line}`);
    }

    //
    if (parts.length === 2) {
      const [ left, right ] = parts;
      const hasMany = left.endsWith("[]");
      if (hasMany) {
        // hasMany
        const [ srcModelName, dstAs ] = left.split('.');
        const dstModelName = right;
        const infos = Object.assign({
          srcModelName: srcModelName,
          dstModelName: dstModelName,
          dstAs: dstAs.replace('[]', '')
        }, options);
        this._createHasManyAssociation(infos);
      } else {
        const [ srcModelName, dstAs ] = left.split('.');
        const dstModelName = right;
        const infos = Object.assign({
          srcModelName: srcModelName,
          dstModelName: dstModelName,
          dstAs: dstAs
        }, options);
        this._createBelongsToAssociation(infos);
      }
    } else {
      const [ left, middle, right ] = parts;
      const [ srcModelName, dstAs ] = left.split('.');
      const infos = Object.assign({
        srcModelName: srcModelName,
        dstModelName: right,
        liaisonModelName: middle,
        dstAs: dstAs.replace('[]', '')
      }, options);
      this._createBelongsToManyAssociation(infos);
    }
  }

  parse(associations) {
    this.logger.log(`ASSOCIATIONS=${associations}`);
    associations.split("\n").forEach((line, i) => {
      const trimedLine = trim(line);
      if (trimedLine.length === 0 || trimedLine[0] === '#') {
        // comment
        return;
      }
      try {
        this._parseLine(trimedLine);
        this.logger.log(`[OK]: ${line}`)
      }
      catch (err) {
        this.logger.error(`[KO]: ${err.message} \n line ${i}: ${line}`);
        throw err;
      }
    });
  }
}


module.exports = AssociationParser;
