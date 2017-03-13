const assert = require('better-assert');

const QueryOptionsVisitor = require('./QueryOptionsVisitor.js');

class QueryOptionsFilter {
  constructor(options) {
    assert(options);
    assert(options.helper);

    const logger = options.logger || options.helper.logger;
    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('QF');
    } else {
      this.logger = logger;
    }
    this.visitorWhen = null;
    this.visitorConditions = null;
  }

  _addMultipleWhereConditions(queryOptions, conditions) {
    assert(queryOptions);
    assert(Array.isArray(conditions));

    if (queryOptions.where && queryOptions.where.$or && queryOptions.where.$and) {
      queryOptions.where.$and = {$and: queryOptions.where.$and, $or: queryOptions.where.$or};
      delete queryOptions.where.$or;
    } else if (queryOptions.where && queryOptions.where.$or) {
      queryOptions.where.$and = {$or: queryOptions.where.$or};
      delete queryOptions.where.$or;
    }
    Object.assign(queryOptions, {
      where: {
        $or: conditions
      }
    });
    return queryOptions;
  }

  _addSingleWhereCondition(queryOptions, condition) {
    assert(queryOptions);
    assert(condition);

    Object.assign(queryOptions, {
      where: condition
    });
    return queryOptions;
  }

  /**
  * query options tree visitor
  * this visitor will be called for each model of the query options tree
  *
  * usage:
  * setVisitor((model, queryOptions, root, context) => {
  *   // will pass in every nested level of query options
  *   // MUST RETURN queryOptions
  *   return queryOptions;
  * })
  *
  * or high level, when & conditions functions.
  *  with single condition output
  *
  * setVisitor(
  *   function when(model, queryOptions, root, context) {
  *     return modle.attributes.active;
  *   },
  *   function condition(model, queryOptions, root, context) => {
  *     return { active: true }
  *   }
  * )
  *
  * or with multiple conditions output
  *
  * setVisitor(
  *   function when(model, queryOptions, root, context) {
  *     return modle.attributes.broadcasters;
  *   },
  *   function conditions(model, queryOptions, root, context) => {
  *     return [
  *       {broadcasters: {$eq: []}},
  *       {broadcasters: {$eq: null}},
  *       {broadcasters: {$contains: [options.req.broadcaster._id]}}
  *     ];
  *   }
  * )
  *
  *
  * @param condition function will be run first.
  * @param filter    function will be run if condition return true
  *  filter should return { attribute: value }; or
  *  filter should return an array [
  *    { attribute: value },
  *    { attribute: value }
  *  ];
  */
  setVisitor() {
    assert(typeof arguments[0] === 'function');
    assert(typeof arguments[1] === 'function' || typeof arguments[1] === 'undefined');

    if (typeof arguments[1] === 'undefined') {
      // single function => low level visitor, triggered on every model.
      this.visitorWhen = () => { return true; };
      this.visitorConditions = arguments[0];
    } else {
      // high level filter function, needs rewrite.
      this.visitorWhen = arguments[0];
      this.visitorConditions = (model, queryOptions, root, options) => {
        const result = arguments[1](model, queryOptions, root, options);

        assert(typeof result === 'object' || Array.isArray(result));

        if (Array.isArray(result)) {
          // array => multiple filters
          return this._addMultipleWhereConditions(queryOptions, result);
        } else {
          // object => simple filter
          return this._addSingleWhereCondition(queryOptions, result);
        }
      };
    }
  }

  run(rootModel, queryOptions, context) {
    assert(typeof this.visitorWhen === 'function');
    assert(typeof this.visitorConditions === 'function');

    const visitor = new QueryOptionsVisitor();
    // le visiteur walk le tree de query options
    visitor.setQueryOptions(queryOptions)
           .visit((queryOptions, root) => {
             // on recherche le model sur lequel
             // s'applique les queryOptions actuelles.
             const model = root ? rootModel: queryOptions.model;

             // on applique le filtrage
             if (this.visitorWhen(model, queryOptions, root, context)) {
               return this.visitorConditions(model, queryOptions, root, context);
             }
             return queryOptions;
           });
    this.queryOptions = visitor.getQueryOptions();
    return this;
  }
}

module.exports = QueryOptionsFilter;
