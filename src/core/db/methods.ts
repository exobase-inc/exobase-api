import _ from 'radash'
import * as Mongo from 'mongodb'
import * as t from '../types'
import type { Collection } from './collections'
// import migrations from './migrations'
import { MongoDocument } from './types'

export const addItem =
  <TDocument, TModel>({
    db: dbPromise,
    collection,
    toDocument
  }: {
    db: Promise<Mongo.Db>
    collection: Collection
    toDocument: (model: TModel) => TDocument
  }) =>
  async (model: TModel): Promise<[Error, TModel]> => {
    const record: TDocument = toDocument(model)
    const db = await dbPromise
    const [err] = await _.try(() => {
      return db.collection<TDocument>(collection).insertOne(record as any)
    })()
    if (err) return [err, null]
    return [null, model]
  }

export const findItem =
  <TModel, TArgs, TDocument extends MongoDocument>({
    db: dbPromise,
    collection,
    toQuery,
    toModel
  }: {
    db: Promise<Mongo.Db>
    collection: Collection
    toQuery: (args: TArgs) => Mongo.Filter<TDocument>
    toModel: (record: TDocument, args?: TArgs) => TModel
  }) =>
  async (args: TArgs): Promise<[Error, TModel]> => {
    const query = toQuery(args)
    const db = await dbPromise
    const [err, record] = await _.try(() => {
      return db.collection<TDocument>(collection).findOne(query) as Promise<TDocument>
    })()
    if (err) return [err, null]
    // const [r] = await migrations.ensureMigrated(db, collection, [record])
    return [null, toModel(record, args)]
  }

export const findManyItems =
  <TModel, TArgs, TDocument extends MongoDocument>({
    db: dbPromise,
    collection,
    toQuery,
    toOptions,
    toModel
  }: {
    db: Promise<Mongo.Db>
    collection: Collection
    toQuery: (args: TArgs) => any
    toOptions?: (args: TArgs) => Mongo.FindOptions<Mongo.Document>
    toModel: (record: TDocument) => TModel
  }) =>
  async (args: TArgs): Promise<[Error, TModel[]]> => {
    const db = await dbPromise
    const cursor = db.collection<TDocument>(collection).find(toQuery(args), toOptions?.(args))
    const [err2, records] = await _.try(() => cursor.toArray() as Promise<TDocument[]>)()
    if (err2) return [err2, null]
    // const rs = await migrations.ensureMigrated(db, collection, records)
    return [null, records.map(toModel)]
  }


export const queryAll =
  <TModel, TArgs, TDocument extends MongoDocument>({
    db: dbPromise,
    collection,
    toOptions,
    toModel
  }: {
    db: Promise<Mongo.Db>
    collection: Collection
    toOptions?: (args: TArgs) => Mongo.FindOptions<Mongo.Document>
    toModel: (record: TDocument) => TModel
  }) =>
  async (args?: TArgs): Promise<[Error, TModel[]]> => {
    const db = await dbPromise
    const col = db.collection<TDocument>(collection)
    const cursor = col.find({}, toOptions?.(args))
    const [err2, records] = await _.try(() => cursor.toArray() as Promise<TDocument[]>)()
    if (err2) return [err2, null]
    // const rs = await migrations.ensureMigrated(db, collection, records)
    return [null, records.map(toModel)]
  }

export const updateOne =
  <TDocument extends t.MongoDocument, TPatch>({
    db: dbPromise,
    collection,
    toQuery,
    toUpdate
  }: {
    db: Promise<Mongo.Db>
    collection: Collection
    toQuery: (patch: TPatch) => Mongo.Filter<TDocument>
    toUpdate: (patch: TPatch) => Partial<TDocument> | Mongo.UpdateFilter<TDocument>
  }) =>
  async (patch: TPatch): Promise<[Error, void]> => {
    const db = await dbPromise
    const [err] = await _.try(() => {
      return db.collection<TDocument>(collection).updateOne(toQuery(patch), toUpdate(patch), {})
    })()
    if (err) return [err, null]
    return [null, null]
  }
