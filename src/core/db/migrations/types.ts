import * as Mongo from 'mongodb'
import { MongoDocument } from '../../types'
import { Collection } from '../collections'

export type MigrationFunction<
  TDocumentIn extends MongoDocument = MongoDocument, 
  TDocumentOut extends MongoDocument = MongoDocument
> = (
  document: TDocumentIn,
  db: Mongo.Db
) => Promise<TDocumentOut>

export type Migration <
  TDocumentIn extends MongoDocument = MongoDocument, 
  TDocumentOut extends MongoDocument = MongoDocument
> = {
  collection: Collection
  versionOut: number
  migrate: MigrationFunction<TDocumentIn, TDocumentOut>
}