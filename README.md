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

create a query builder

```js
const qb = helper.createQueryOptionsBuilder();
```

add root Model & initial query options

```js
qb.setRootModel(ModelFoobar)
  .setInitialQueryOptions({ where: { _id: 42 } });
```

add filters

```js
qb.filter(filterActive, {req: req})
  .filter(filterBet, {req: req})
  .filter(filterBroadcaster, {req: req})
  .filter(filterCountry, {req: req});
```

get resulting queryOptions

```js
qb.getQueryOptions();
```

## QueryBuilder filters

create filter with simple where condition

```js
const filter = helper.createQueryOptionsFilter();

filter.setVisitor(
  function when(model, queryOptions, root, options) {
    return model.attributes.active;
  },
  function where(model, queryOptions, root, options) {
    return { active: true };
  }
);
```

create filter with multiple where conditions

```js
const filter = helper.createQueryOptionsFilter();

filter.setVisitor(
  function when(model, queryOptions, root, options) {
    return model.attributes.countries;
  },
  function where(model, queryOptions, root, options) {
    return [
      {countries: {$eq: []}},
      {countries: {$eq: null}},
      {countries: {$contains: [options.req.country._id]}}
    ];
  }
);
```

low level api (single function parameter)

```js
const filter = helper.createQueryOptionsFilter();

filter.setVisitor((model, queryOptions, root, options) => {
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

```js
queryOptionsBuilder.filter(filterActive, {req: req});
```
