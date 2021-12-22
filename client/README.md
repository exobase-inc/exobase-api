# `@exobase/client-js`

> Javascript client for interacting with the Exobase platform API

## Install
```
yarn add @exobase/client-js
```
_Types are included, if your into that._

## Usage

```ts
import _ from 'radash'

const list = [1, 2, 3, 4, 5, 6]

const oddsSquared = _.select(list, x = x*x, x => x % 2)
const { odds, evens } = _.group(list, x => x % 2 ? 'odds' : 'evens' )
```