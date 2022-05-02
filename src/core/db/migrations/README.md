# Exobase Migrations

> Welcome to my custom migration module. I _think_ it will be good... we will see.

## Why Ray? Why...
Because I'm the god-king of Exobase. I don't want to run migrations the normal & excepted way that requires a synchronous script to run at deploy time. It leads to down time
as you scale, bugs can -- IME -- take down production, and when working with serverless, container, or any ephemral architecture cause mass complexity to determine if/when migrations should be executed. **I want to do migrations at live time.** If I make a breaking change to the way data is stored in a document I want to write a small function -- that I can test -- to convert the previous version of the document to the new version of the document. 

## But How?
Instead of thinking of the entire database schema as one version I consider each document/collection
to have a version. We store the version of every document as `_version` on the document in the db. Every
time we read a document -- either by find or query -- we check the `_version` on each result document
and ensure that it is up to date with the latest document migration version (stored as a constant via `ALL_MIGRATIONS`). If it's not up to date with the latest migration version, we run all
migrations on it in order to generate the latest document verion. Then we execute a batch operation to update all migrated documents to their new value. This all happens live, at query time, before returning the final result via the `ensureMigrated` function.

## A Note to the Future
If you are here because this is broken and you have to fix it... I am sorry. It's an experimental solution. I recognize this may need to work in conjunction with a typical migration tool for specific document/schema changes that are too large to work in a versioned document solution like this.
