# Multicall Batcher

easy to use [multicall](https://github.com/makerdao/multicall) integration for your dapp.
supports both multicall and multicall2.

## Installation

```
npm i multicall-batcher
// or
yard add multicall-batcher
```

## Usage example

```
import multicallBatcher from 'multicall-batcher';

function getLibrary(provider) {
  const library = new Web3Provider(multicallBatcher(provider, {
    // batchDebounce: false,
    // batchInterval: 10,
    // batchMax: 0,
    // v1: false,
    // ignoreWithFrom: false,
    multicallAddress: "0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb",
  }))
  return library;
}

ReactDOM.render(
  <Web3ReactProvider getLibrary={getLibrary}>
    <App />
  </Web3ReactProvider>,
  document.getElementById('root')
);
```

## Contract Address

you can find multicall contract address for different networks [here](https://github.com/makerdao/multicall#multicall2-contract-addresses).
