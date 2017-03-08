const assert = require('better-assert');

function modelNameToForeignKey(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1) + 'Id';
}

function modelNameToAs(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function hasMany(infos) {
  assert(infos);
  assert(infos.srcModel);
  assert(infos.dstModel);
  assert(infos.dstAs);

  infos.srcModel.hasMany(infos.dstModel, {as: infos.dstAs, foreignKey: infos.foreignKey});
  return infos;
}

function belongsTo(infos) {
  assert(infos);
  assert(infos.srcModel);
  assert(infos.dstModel);
  assert(infos.dstAs);

  infos.srcModel.belongsTo(infos.dstModel, {as: infos.dstAs, constraints: infos.constraints, foreignKey: infos.foreignKey, targetKey: infos.targetKey});
  return infos;
}

function belongsToMany(infos) {
  assert(infos);
  assert(infos.srcModel);
  assert(infos.dstModel);
  assert(infos.liaisonModel);
  assert(infos.dstAs);

  infos.srcModel.belongsToMany(infos.dstModel, {through: infos.liaisonModel, as: infos.dstAs, foreignKey: infos.foreignKey});
  return infos;
}

module.exports.modelNameToForeignKey = modelNameToForeignKey;
module.exports.modelNameToAs = modelNameToAs;
module.exports.hasMany = hasMany;
module.exports.belongsTo = belongsTo;
module.exports.belongsToMany = belongsToMany;
