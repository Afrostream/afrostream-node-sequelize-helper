const assert = require('better-assert');

const QueryOptionsFilter = require('./QueryOptionsFilter.js');

class QueryOptionsBuilder {
  constructor(options) {
    assert(options);
    assert(options.helper);

    const logger = options.logger || options.helper.logger;
    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('QB');
    } else {
      this.logger = logger;
    }
    this.rootModel = null;
    this.queryOptions = {};
  }

  setRootModel(rootModel) {
    assert(rootModel);

    this.rootModel = rootModel;
    return this;
  }

  setInitialQueryOptions(queryOptions) {
    assert(queryOptions);

    this.queryOptions = queryOptions;
    return this;
  }

  _dupIncludedModel(im) {
    return {
      model: im.model,
      required: im.required,
      as: im.as
    };
  }

  /**
   * return all associations possible for a specific model.
   *
   * @param Model                  Object
   * @param mandatoryAssociations  Map
   * @param optionalAssociations   Map
   * @return Array of associations : [{model: Model, as: '...'}, { ... }]
   */
  _allPossibleAssociations(Model, mandatoryAssociations, optionalAssociations) {
    return (mandatoryAssociations.get(Model) || []).concat(optionalAssociations.get(Model) || []);
  }

  /**
   * return a single possible association for a specific model
   *
   * @param Model                  Object
   * @param as                     String
   * @param mandatoryAssociations  Map
   * @param optionalAssociations   Map
   * @return Object  ex: {model: Model, as: '...'}
   */
  _specificAssociation(Model, as, mandatoryAssociations, optionalAssociations) {
    return this._allPossibleAssociations(Model, mandatoryAssociations, optionalAssociations)
      .find(association => association.as === as);
  }

  /**
   * recursive include of optionnal associations
   *
   * @param Model                 Object   current model
   * @param mandatoryAssociations Map
   * @param optionalAssociations  Map
   * @param includes              Object   current model includes
   * @param path                  Array    ex: ["episodes"] if current model is Season
   */
  _addIncludeAt(Model, mandatoryAssociations, optionalAssociations, includes, path) {
    assert(Model);
    assert(mandatoryAssociations instanceof Map);
    assert(optionalAssociations instanceof Map);
    assert(Array.isArray(includes));
    assert(Array.isArray(path));

    if (!path.length) return;
    const as = path.shift();
    //
    // searching if there is already an includedModel corresponding to
    //   the included path. if exist => nothing, elseif => include it.
    //
    // ex: Model.include = [ { model: ..., as: 'episodes', required: false} ]
    //   <=> no need to do anything
    let includedModel = includes.find(im => im.as === as);
    if (!includedModel) {
      // no included model => we need to include it.
      //    <=> Model.include = [ (... not included here yet ...) ]
      includedModel = this._specificAssociation(Model, as, mandatoryAssociations, optionalAssociations);
      if (!includedModel) {
        return; // stop, dead end with path.
      }
      includedModel = this._dupIncludedModel(includedModel);
      includes.push(includedModel);
    }
    // model exist => continue
    includedModel.include = includedModel.include || [];
    this._addIncludeAt(includedModel.model, mandatoryAssociations, optionalAssociations, includedModel.include, path);
  }

  _addMandatoryIncludes(Model, mandatoryAssociations, includes) {
    assert(Model);
    assert(mandatoryAssociations instanceof Map);
    assert(Array.isArray(includes));

    // current level has mandatory models ?
    (mandatoryAssociations.get(Model)||[])
      .forEach(mandatoryModel => {
        if (!includes.find(im=>im.as===mandatoryModel.as)) {
          includes.push(this._dupIncludedModel(mandatoryModel));
        }
      });
    // recursive call.
    includes.forEach(includedModel => {
      includedModel.include = includedModel.include || [];
      this._addMandatoryIncludes(includedModel.model, mandatoryAssociations, includedModel.include);
    });
  }

  populate(populate, mandatoryAssociations, optionalAssociations, whitelist) {
    assert(this.rootModel);
    assert(typeof populate === 'string');
    assert(mandatoryAssociations instanceof Map);
    assert(optionalAssociations instanceof Map);
    assert(typeof whitelist === 'undefined' || Array.isArray(whitelist));

    const includes = this.queryOptions.include || [];

    // FIXME: implement whitelist

    // converting populate string to populate.
    // "seasons.episodes,seasons.episodes.video"
    // => [["seasons"."episodes"],["seasons", "episodes", "videos"]]
    populate = populate.split(',').map(p => p.split('.'));

    // foreach of this entry, add input populate associations
    populate.forEach(path => {
      this._addIncludeAt(
        this.rootModel,
        mandatoryAssociations, optionalAssociations,
        includes, path
      );
    });

    // add mandatory associations
    this._addMandatoryIncludes(this.rootModel, mandatoryAssociations, includes);
    // saving the result
    this.queryOptions.include = includes;
    //
    return this;
  }

  filter(filter, context) {
    assert(filter instanceof QueryOptionsFilter);

    filter.run(this.rootModel, this.queryOptions, context);
    return this;
  }

  getQueryOptions() {
    return this.queryOptions;
  }
}

module.exports = QueryOptionsBuilder;
