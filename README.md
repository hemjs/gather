# @hemjs/gather

> A lightweight library for collecting and merging configuration from multiple sources.

```ts
import { Gather } from '@hemjs/gather';

const gather = new Gather([{ bar: 'bat' }, { foo: ['bar'] }]);
const config = gather.getMerged(); // { bar: 'bat', foo: ['bar'] }
```

## Installation

Using npm:

```sh
npm install --save @hemjs/gather
```

or using yarn:

```sh
yarn add @hemjs/gather
```
