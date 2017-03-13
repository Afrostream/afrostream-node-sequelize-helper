const assert = require('better-assert');

class QueryOptionsVisitor {
  constructor(options) {
    const logger = options && options.logger || console;

    if (typeof logger.prefix === 'function') {
      this.logger = logger.prefix('VISITOR');
    } else {
      this.logger = logger;
    }
    this.queryOptions = null;
  }

  setQueryOptions(queryOptions) {
    assert(queryOptions);

    this.queryOptions = queryOptions;
    return this;
  }

  _visitRec(options, visitor, root) {
    assert(options);
    assert(typeof visitor === 'function' || typeof visitor === 'object' && visitor);
    assert(typeof root === 'boolean');

    console.log('_visitRec ');
    console.log(require('util').inspect(options, {depth:1}));

    if (Array.isArray(options.include)) {
      options.include = options.include.map(subOptions => this._visitRec(subOptions, visitor, false));
    }
    if (typeof visitor === 'function') {
      return visitor(options, (root === true)); // visitor visit the query option branch
    }
    return Object.assign(options, visitor);
  }

  /*
   * visitor of queryOptions
   *  (/!\ mutate queryOptions)
   *
   * @param o       object|function    input mutator
   *
   * examples:
   *  qb.setInitialQueryOptions({ where: { id: 42 }, include: [ { model: Foo } ] })
   *    .filterOptions({ required: false })
   *    .getQueryOptions();
   *   => { where: { id: 42 }, include: [ { model: Foo, required: false } ], required: false }
   *
   * db.setInitialQueryOptions(queryOptions, (options, root) => {
   *   options.foo = 'bar';
   *   return options;
   * });
   */
  visit(visitor) {
    assert(this.queryOptions);
    assert(typeof visitor === 'function' || typeof visitor === 'object' && visitor);

    this.queryOptions = this._visitRec(this.queryOptions, visitor, true);
    return this;
  }

  getQueryOptions() {
    return this.queryOptions;
  }
}

module.exports = QueryOptionsVisitor;
