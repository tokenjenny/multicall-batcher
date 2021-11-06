# Multicall Batcher

easy to use [multicall](https://github.com/makerdao/multicall) integration for your DAPP.

## Installation

```
npm i multicall-batch
// or
yard add multicall-batch
```

## Usage

```
import multiCallBatch from 'multicall-batch';

function getLibrary(provider) {
  const library = new Web3Provider(multiCallBatch(provider, {
    multicallAddress: "0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb",
  }))
  return library;
}

ReactDOM.render(
  <React.StrictMode>
    <Web3ReactProvider getLibrary={getLibrary}>
      <App /> 
    </Web3ReactProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
```
