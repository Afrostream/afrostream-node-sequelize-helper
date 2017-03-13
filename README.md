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

## QueryBuilder auto-populating

the querybuilder can parse a populate options query string

the syntax is :

```
includedAssociation,includedAssociation.nestedIncludedAssociation,(...)
```

ex:

```
seasons,seasons.episodes
```

you can get it from a query string

```
?populate=seasons,seasons.episodes
```

the query builder will auto add sequelize included: [ { ... } ] models.

### optional associations

every models can have one or many optional associations


```
optionalAssociations.set(modelA, [
  { model: modelB, ... },
  { model: modelC, ... },
  (...)
])
```

when the query builder parse "populate" option, the query builder check
if this is an optional associations. if true => the query builder will add
the included model associated.

example:

```js
// Serie.seasons[]    -> Season
// Season.episodes[]  -> Episode
const mandatoryAssociations = new Map();
const optionalAssociations = new Map();

optionalAssociations[Serie] = { model: Season, as: 'seasons', required: false };
optionalAssociations[Season] = { model: Episode, as: 'episodes', required: false, foo: 'bar' };

qb.setRootModel(Serie)
  .populate("seasons", mandatoryAssociations, optionalAssociations)
  .getQueryOptions();
// will contain:
// {
//   (...),
//   included: [ {
//     model: Season,
//     as: 'seasons',
//     required: false
// }

qb.setRootModel(Serie)
  .populate("seasons.episodes", mandatoryAssociations, optionalAssociations)
  .getQueryOptions();
// will contain:
// {
//   (...),
//   included: [ {
//     model: Season,
//     as: 'seasons',
//     required: false
//     included: [ {
//       model: Episode,
//       as: 'episodes',
//       required: false,
//       foo: 'bar'
//     } ]
//   } ]
// }
```

### mandatory associations

every models can have one or many mandatory association

```
mandatoryAssociations.set(modelA, [
  { model: modelB, ... },
  { model: modelC, ... },
  (...)
])
```

as soon as the query builder finds modelA, the query builder will
include the associations found in the mandatoryAssociations map.

example:

```js
// working with models associations:
// Serie.seasons[]    -> Season
const mandatoryAssociations = new Map();
const optionalAssociations = new Map(); // empty

mandatoryAssociations[Serie] = { model: Season, as: 'seasons', required: true };

qb.setRootModel(Serie)
  .populate("", mandatoryAssociations, optionalAssociations)
  .getQueryOptions();
// will contain:
// {
//   (...),
//   included: [ {
//     model: Season,
//     as: 'seasons',
//     required: true
// }
```

example

```js
// working with models associations:
// Serie.seasons[]      -> Season
// Season.episodes[]    -> Episode
const mandatoryAssociations = new Map();
const optionalAssociations = new Map();

optionalAssociations[Serie] = { model: Season, as: 'seasons', required: true };
mandatoryAssociations[Season] = { model: Episode, as: 'episode', required: false };

qb.setRootModel(Serie)
  .populate("seasons", mandatoryAssociations, optionalAssociations)
  .getQueryOptions();
  // will contain:
  // {
  //   (...),
  //   included: [ {
  //     model: Season,
  //     as: 'seasons',
  //     required: false
  //     included: [ {
  //       model: Episode,
  //       as: 'episodes',
  //       required: false
  //     } ]
  //   } ]
  // }
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
