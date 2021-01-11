In this assignment, we will focus on **Knex Migrations** which allow us to define and update our database schema using JavaScript files.

Knex will be our primary tool for editing the tables in our database. While its interface is extensive for interacting with SQL databases, in this lesson we will cover the essentials.

## Learning Goals

- Use SQL to directly create tables and columns
- Understand an overview of Knex.js config
- Create our first migration and table with Knex
- Know how to roll back a change to our database
- Add and remove individual columns on a table

## Getting Started

```no-highlight
et get introduction-to-knex
cd introduction-to-knex
yarn install
cd server
```

## Data Definition Language

Before we can start inserting rows into a relational database we need to define the table structure that will store this information. SQL includes a [**data definition language**](https://en.wikipedia.org/wiki/Data_definition_language) for creating and updating our schema using statements such as `CREATE TABLE` and `ALTER TABLE`.

Let's create a database to store song information. From the terminal run the following commands to create a database and open a connection to it:

```no-highlight
createdb songs_development
psql songs_development
```

You should see the following in your console (the version number may vary):

```no-highlight
psql (10.5)
Type "help" for help.

songs_development=#
```

Running `\d` at the `songs_development=#` prompt should yield the message `No relations found.`, indicating that there are currently no tables (i.e., relations) in the `songs` database.

In the terminal, let's define a table to store individual songs along with the album they appear on and the artist:

```SQL
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    album VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL
);
```

The `CREATE TABLE` statement will update our database schema so that we have a place to store songs. We can check out our new `songs` table by running `\d songs` at the prompt, which should yield

```no-highlight
                                 Table "public.songs"
 Column |          Type          |                     Modifiers
--------+------------------------+----------------------------------------------------
 id     | integer                | not null default nextval('songs_id_seq'::regclass)
 name   | character varying(255) | not null
 album  | character varying(255) | not null
 artist | character varying(255) | not null
Indexes:
    "songs_pkey" PRIMARY KEY, btree (id)
```

It's difficult to predict everything we're going to need for an application up front. In the case of our database, let's assume we need to store the genre as well. Our updated statement might look something like:

```SQL
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    album VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    genre VARCHAR(255) NOT NULL
);
```

The problem is that if we run this new statement after we've already created the table we'll encounter the following error:

```no-highlight
ERROR:  relation "songs" already exists
```

PostgreSQL doesn't allow us to redefine tables in this way. Instead, we need to specify what has changed from one state to the next. In this case we're adding a column so we can use the `ALTER TABLE` statement instead:

```SQL
ALTER TABLE songs ADD COLUMN genre VARCHAR(255) NOT NULL;
```

Running this command will update the schema accordingly:

```no-highlight
songs_development=# \d songs
                                 Table "public.songs"
 Column |          Type          |                     Modifiers
--------+------------------------+----------------------------------------------------
 id     | integer                | not null default nextval('songs_id_seq'::regclass)
 name   | character varying(255) | not null
 album  | character varying(255) | not null
 artist | character varying(255) | not null
 genre  | character varying(255) | not null
Indexes:
    "songs_pkey" PRIMARY KEY, btree (id)
```

This process of updating our database via a `psql` session is tedious. It's also error prone, and we don't have a way of tracking how we want to update the database over time. For instance, what if you wanted your friend Anjali to run the same update to their songs database? Presumably you would have to track this in `.sql` file. But what if, as you were adding to this app, you add more changes to your `songs` table? Sharing those with Anjali would be more and more complicated as our database grows. Thankfully, Knex.js can help us with this.

## Configuring Knex.js

It's very likely that our database schema will change over time. As applications mature and requirements change, we have to modify our schema to handle new information or find better ways to represent what we already have. Applications tend to accumulate many incremental changes that move the database from one state to the next.

It's important to maintain an ordering of these changes so that we can re-build the schema from scratch and determine what new changes are required. For example, if we add a column to a table in our development database, we need to record that change somewhere so we can also apply it to our production database. If our team has multiple developers, it is important that they apply the same changes to _their_ development databases so that everyone's databases stay in sync.

Knex.js is a library that helps us interface with our database using files. Knex manages these incremental changes by defining **migrations**. A migration is a set of instructions that will update a database from one state to the next. This usually consists of changing the schema in some way: creating a new table, adding or removing columns, inserting indexes, etc.

Let's see how we can manage creating our songs database using Knex.

We've provided a pre-configured Express app for you to use. Focus on the files in the `server` folder, as the Knex configuration we set up will be housed on our backend server.

Within the `package.json` we have added two key libraries to ensure our app can communicate with our database (please don't edit this file):

```javascript
// ...
  "dependencies": {
    // ...
    "knex": "^0.21.2",
    "pg": "^8.3.0"
    // ...
  }
```

`knex` is of course the primary technology we will be using to manage changes to our database schema. The `pg` gem will help ensure we can connect to our local PostgreSQL database without issue.

Note: these are dependencies of the `server` application which houses our Express app. These should already be installed.

Now we have the libraries we need to use Knex. Knex won't actually integrate too much with our Express.js app, but eventually our Express web applications will interact with the database that Knex helps us create.

If we were to run `knex init` (do not run), a `knexfile.js` would be generated for us that determines our configuration for various environments (we will be focused on `development`, the default environment on your local machine). However, we have provided this file for you for ease of development.

```javascript
const path = require("path")
const getDatabaseUrl = require("./src/config/getDatabaseUrl.cjs")

const migrationPath = "src/db/migrations"

module.exports = {
  connection: getDatabaseUrl(process.env.NODE_ENV || "development"),
  client: "pg",
  migrations: {
    directory: migrationPath,
    extension: "cjs",
    stub: path.join(migrationPath, "migration.stub.cjs"),
  },
}
```

Without going too in depth, this file tells Knex how we want to run our migrations. We will focus on the `development` environment.

* `client: pg`: designates our database as a PostgreSQL database
* `connection`: establishes WHICH database this app will connect to on our local machine, depending on the environment
* `migrations/directory`: tells Knex which directory our migrations (changes to our schema) are added to
* `extension`: indicates that generated knex files end with `.cjs` rather than `.js` to allow our Knex files to play nicely with our ES Modules syntax in our Express app
* `stub`: accepts a path to a stub file, which will be the template we use to generate migrations

#### CommonJS

You've probably noticed that the syntax, particularly at the top and bottom of certain files, might look different than what you are used. Certain libraries we will be working with like Knex require that we use CommonJS syntax for the exporting of certain modules. Because we are sharing code on a file's `module.exports` object, this has the benefit of also keeping our code loosely coupled.

You'll generally be able to tell that a JavaScript file is using CommonJS syntax if it uses `require` or `module.exports` keyword, or if the file extension is `cjs`

`require` statements are rather similar to the `import` statements we might see in ES Modules syntax, while `module.exports` is similar to `export default`.

```js
// CommonJS
const Dog = require("./Dog.js")
// ES Modules
import Dog from "./Dog"

// CommonJS
module.exports = { Dog }
// ES Modules
export default Dog
```

### Generating a Migration

We will also need a `db/migrations/migration.stub.js` file, which is our template for making migrations. You can ignore the `/**` lines, which are there for the purpose of linting and as a form of documentation via code comments. The `exports.up` and `exports.down` are the only lines that will actually run, and these will go over shortly.

```js
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => {}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {}

```


Our `app.js`, `config.js` and `boot.js` will handle the rest of the config for this Express app that aren't directly tied to Knex configuration.

The last file of note is a custom file that we have provided: `server/src/config/getDatabaseUrl.cjs`. This file will ensure that Knex interacts with the correct database for this specific app. Each app will have a slightly different `development` and `test` database name, based on the focus of the app.

```js
const getDatabaseUrl = (nodeEnv) => {
  return (
    {
      development: "postgres://postgres:postgres@localhost:5432/songs_development",
      test: "postgres://postgres:postgres@localhost:5432/songs_test",
    }[nodeEnv] || process.env.DATABASE_URL
  )
}

module.exports = getDatabaseUrl
```

While you won't have to edit the entire `postgres://postgres:postgres@localhost:5432/songs_development` string from app to app, you may end up editing the last segment of this string corresponding to the database name e.g. `songs_development`.

### Running Migrations

Before continuing to Knex migrations, make sure to reset your database with the following commands:

```
dropdb songs_development
createdb songs_development
```

Now that we have a blank database, let's create a new migration to create our `songs` table. Each new migration will live in a file within the `db/migrations` directory and is prefixed with a timestamp for when the migration was created. To generate a new migration we can run the `migrate:make` script that Knex provides us once installed, and which we have made easily accessible in our `package.json` `scripts`:

From the `server` folder:
```no-highlight
yarn run migrate:make createSongs
```

`migrate:make` accepts an argument of a file name, which should generally be a brief description of the change we want to make to our database. `createSongs` is conventional if we want to make a new songs table, and automatically gets appended to the end of the file name. The file is also prepended with a timestamp of when we created this file which is important to ensure that our migrations are run in the proper order.

Let's examine this file at `server/src/db/migrations/<TIMESTAMP>createSongs`:

```js
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => {}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {}

```

Again, we can ignore the lines that are comments. Our `exports...` statements are where we are going to define how we want our database to change. Specifically, we will define what table we want to add and what its columns should be:

```js
exports.up = async (knex) => {
  return knex.schema.createTable("songs", (table) => {
    table.bigIncrements("id").primary()
    table.string("name").notNullable()
    table.string("artist")
    table.string("album")
    table.integer("songNumber")
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("songs")
}
```
The `exports.down` property will help determine what happens if we want to undo or "rollback" the change to our schema that we perform in `exports.up`. We will come back to this.

At `exports.up`, we are defining a migration function to be run when prepared. Since this migration requires communicating with an external application (Postgres) we will make sure that it is returns a Promise in order to be handled correctly. A `knex` object will automatically be passed to our migration function for use. `knex.schema.createTable()` is a function that takes in the name of the table we wish to create, and a callback function that will be passed an object (which we give a name to, `(table)`) that we can chain methods onto, to determine the columns we wish to define on our songs table. From here, each line will generally represent a different column.

Running `yarn run migrate:latest` will turn this migration into a table in your database without having to write any SQL! We can verify it exists by connecting directly with `psql` and inspecting the schema:

```no-highlight
psql songs_development
songs_development=# \d songs
 ```

### Schema Building Basics

Let's break down the migration we ran and how it generated our `songs` table.

```js
table.bigIncrements("id").primary()
```

This designates that the table should have a column called `id` that will be the primary key for the table. It is also auto-incrementing, meaning we will never need to edit this column directly (Knex will change it for us!). Every one of our tables should have this identical line.

```js
table.string("name").notNullable()
table.string("album")
table.integer("songNumber")
```

`table.string("name")` tells Knex that we want a `name` column on our table, that has a datatype of a string. By chaining the `notNullable()` method at the end of this line, we also designate this column as `NOT NULL`. As such, whenever we attempt to persist a new song record in this table, a name value must be present. For those columns that do not have `.notNullable()`, a value for columns like `album` and `songNumber` are optional.

`.bigIncrements()`, `string()` and `integer()` are going to be some of the most frequent data types you designate for the columns on our tables, but other frequently methods include:

```js
.bigInteger() // for foreign keys
.float() // for numbers requiring a decimal
.text() // for strings larger than 255 characters
.boolean() // true/false
.timestamp() // for recording when we've last updated a record
```

For more column data types we can designate and for other methods we can use against the Knex table schema object, check out the [Knex Documentation on Schema Building](https://knexjs.org/#Schema-Building).


### Migration Rollbacks

The `exports.up()` method helped us create a table when we migrate forward, but the `.down()` method provides us an interface for undoing or rolling back our changes. **For every `up` action we perform, we should have a corresponding down action to revert our work if it would cause issues.**

For those migrations in which we create a table, we will use the `dropTable` command in `exports.down`, so that we might have a way to reverse the creation of a table we have just made. If in a migration, we were to only add a column to an existing table, then we would only define Knex code that would undo the addition of said column.

For instance, if we misspelled one of our column's names (e.g. "atrist" instead of "artist") then we need a way to undo our mistake. Knex/our scripts provide a command to roll back the last migration run:

```no-highlight
yarn run migrate:rollback

Batch 1 rolled back: 1 migration
✨  Done in 0.76s.
```

The `migrate:rollback` script will undo the last migration and try to run the **inverse** of what the migration did. If we originally created a table, the inverse would be to drop the table.

This is important if we ever want to change a migration. Once we publish a migration to production or share it with our other developers, it is important that we **never** modify it. Unless the other developers know to explicitly roll back and re-run the migration, they won't receive our changes.

The one exception is if we're actively developing a migration and we need to tweak it before committing it to our application. Before modifying a migration, roll back the changes first, modify the file, and run the migrate task again:

```no-highlight
# Step 1: Roll back the latest migration
$ yarn run migrate:rollback

# Step 2: Modify the contents of the migration
$ ...

# Step 3: Re-run the migration
$ yarn run migrate:latest
```

To make sure that your migrations are always reversible, get in the habit of **running `yarn run migrate:latest && yarn run migrate:rollback && yarn run migrate:latest`** (You may wish to save this command somewhere to avoid lots of typing!) This command will attempt to migrate, rollback, and then remigrate. If you get an error during the `rollback` portion, it likely means that your migration was irreversible. If this is the case, drop and recreate your database, edit your migration file, and run `yarn run migrate:latest && yarn run migrate:rollback && yarn run migrate:latest` again.

Note that you would never want to drop a live production database! Luckily, you're a good developer who tests their migrations locally before modifying the production database.

By the end of this portion, your migration file should look like the snippet below. If not, drop your database with the `dropdb songs_development` command, recreate your database and your migration with the following:

```js
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => {
  return knex.schema.createTable("songs", (table) => {
    table.bigIncrements("id").primary()
    table.string("name").notNullable()
    table.string("artist")
    table.string("album")
    table.integer("songNumber")
  })
}

/**
 * @param {Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("songs")
}
```


### Adding a Column
Now let's see how we can add the _genre_ column to our table:

```no-highlight
yarn run migrate:make addGenreToSongs
```

Note that the name we gave this migration `addGenreToSongs` is both concise and descriptive, and accurately describes the action we wish to perform and the table that is affected

Every change we want to make to the database schema should exist in a new migration. Migrations represent the incremental changes we make to our database and exist as a list of files in the `db/migrations` directory. Let's open the newly generated migration in our editor and modify the up method like so:

```js
/**
 * @typedef {import("knex")} Knex
 */

/**
 * @param {Knex} knex
 */
exports.up = async (knex) => {
  return knex.schema.table("songs", (table) => {
    table.string("genre")
  })
}

/**
 * @param {Knex} knex
 */
exports.down = async (knex) => {
  return knex.schema.table("songs", (table) => {
    table.dropColumn("genre")
  })
}
```

When we run this migration it will add a column to the table:

```no-highlight
yarn run migrate:latest

Batch 2 run: 1 migrations
✨  Done in 1.84s.
```

**Note:** When creating columns, remember that numbers like zip codes should be strings, rather than integers, because the leading zero is meaningful and will otherwise be ignored by PostgreSQL (e.g., if it evaluated `03038` as a number, it would become `3038` in our database). Moreover, some column names are reserved by PostgreSQL for other purposes, such as `type`.

### Remembering Migrations

Once a migration has been run, the database makes note of which migrations we have run thus far. This helps us avoid issues whereby we accidentally try to run a migration more than once. Knex stores this migration data in an additional table called **knex_migrations**:

```no-highlight
psql songs_development

songs_development=# SELECT * FROM knex_migrations;
 id |                name                | batch |       migration_time
----+------------------------------------+-------+----------------------------
  3 | 20201026171217_createSongs.cjs     |     1 | 2020-10-28 11:57:05.912-04
  4 | migration.stub.cjs                 |     1 | 2020-10-28 11:57:05.917-04
  5 | 20201028120920_addGenreToSongs.cjs |     2 | 2020-10-28 12:11:43.092-04
(3 rows)
```

Every time we run a new migration, a row is added to the _knex_migrations_ table that remembers the ID of the last migration run (where the ID is the timestamp prefix for each migration file). When we run the migrate command again, it will only try to run any migrations that it hasn't seen before.

Thankfully, you can largely `knex_migrations` table as this will be managed for you by Knex itself.

Note: you may ignore the migration.stub.cjs file, which is the template file for any new migrations we create.

### Knex Commands to Know
In closing, here are some of the key commands we ran from our `server` folder in order to work with Knex migrations. You can also see them listed under `scripts` in the `server/package.json` file.

`yarn run migrate:make <Name-Of-Migration>`
`yarn run migrate:latest`
`yarn run migrate:rollback`

**Schema Building**
Here are the key schema building methods we used in our migrations for reference.

```js
  knex.schema.createTable("songs") // adding a new table
  knex.schema.dropTableIfExists("songs") // dropping a table
  knex.schema.table("songs") // editing an existing table
  table.dropColumn("genre") //dropping a column
```

## Summary

Knex **migrations** provide a convenient mechanism for managing changes to the database schema. A migration specifies the changes required to transition from one state to the next.

The **yarn run migrate....** commands are used create new migrations, run available migrationsm, and roll them back if anything goes wrong. Once a migration has been run it is recorded within the **knex_migrations** table in the database. If a migration needs to be changed, roll back before making changes to ensure that it is run again on the next migrate command.
