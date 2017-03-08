# Description

Helper around sequelize ORM providing
 - directory model loader
 - DSL model associations creator
 - query builder with filters

# Usage

## Loader

directory model loader

```js
const Helper = require('afrostream-node-sequelize-helper')
const helper = new Helper(sequelize);

// load a bunch of models
const models = helper.loadModelsFromDirectory(__dirname + '/models');
// or, access the models using
helper.models;
```

DSL model associations creator

```js
// define associations
helper.associateModels(`
  # LifePin.belongsTo(Image, {as: 'image', constraints: false})
    LifePin         -> Image
  # Post.belongsTo(Image, {as: 'poster', constraints: false});
  Post.poster -> Image


  # User.hasMany(LifePin, {as: 'lifePins', foreignKey: 'userId'});
    User.lifePins[] -> LifePin

  # LifePin.belongsToMany(LifeTheme, {through: LifeThemePins, as: 'themes', foreignKey: 'lifePinId'});
  # LifeTheme.belongsToMany(LifePin, {through: LifeThemePins, as: 'pins', foreignKey: 'lifeThemeId'});
  LifePin.themes[] -> LifeThemePins -> LifeTheme
  LifeTheme.pins[] -> LifeThemePins -> LifePin
`);
// get models { ModelNameA: Model, ... }
helper.models;
```

## Query builder

```js
const queryOptionsBuilder = helper.createQueryOptionsBuilder();
queryOptionsBuilder.setRootModel(ModelFoobar);
queryOptionsBuilder.setInitialQueryOptions({ where: { _id: 42 } });

ModelFoobar.findAll(queryOptionsBuilder.getQueryOptions()).then(...)
```

creating filters

```js
// considering the following query options :
// {   <= root level
//   where: { _id: 42 },
//   include: [ { model: NestedModelA, as: 'A', required: false } ] <= branch model
// }
//
// you can implement the following recursive filter working on every branch
//  of the query option tree
//
const filterActive = helper.createFilter((model, queryOptions, root, options) => {
  // model: current branch model
  // queryOptions: current branch options
  // root: are we at the root of the tree
  // options: additional options passed by the query builder
  if (model.attributes.active) {
    Object.assign(queryOptions, { where: { active: true } });
  }
});
```

using filter

```
queryOptionsBuilder.addFilter(filterActive, {req: req});
```

high level filter creators

```js
const filterActive = helper.createFilterAND(
  function condition(model, queryOptions, root, options) {
    return model.attributes.active;
  },
  function where(model, queryOptions, root, options) {
    return { active: true };
  }
);
```

```js
const filterActive = helper.createFilterOR(
  function condition(model, queryOptions, root, options) {
    return options.req && model.attributes.broadcasters;
  },
  function where(model, queryOptions, root, options) {
    return [
      {broadcasters: {$eq: []}},
      {broadcasters: {$eq: null}},
      {broadcasters: {$contains: [options.req.broadcaster._id]}}
    ];
  }
);
```

## CRUD Router

```
const Helper = require('afrostream-node-sequelize-helper')

router.use('/elementFilms', Helper.routerCRUD({Model: sqldb.ElementFilm}));
```

# low level api

generic filterOptions

```js
helper.queryBuilder.filterOptions(options, (options, root) => { ... })
```

example

```js
helper.queryBuilder.filterOptions(options, (options, root) => {
  const model = root ? MyModel : options.model;

  if (model &&
      model.attributes &&
      model.attributes.active) {
    options = _.merge(options, {where: {active: true}});
  }
  return options;
});
```

# Internals
