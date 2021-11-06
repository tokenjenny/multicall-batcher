import multicallBatcher from '../src';
import ganache from 'ganache';
import { helloWorld, multicall2 } from './contracts';
const Web3 = require('web3');

const provider = ganache.provider();

const web3 = new Web3(provider, null, {
  transactionConfirmationBlocks: 1,
});

let helloWorldAddress = '';
let multicall2Address = '';

beforeAll(async () => {
  const accounts = await web3.eth.getAccounts();

  let contract = new web3.eth.Contract(helloWorld.abi);
  contract = contract.deploy({
    data: helloWorld.bytecode,
    arguments: [],
  });
  const helloWorldContract = await contract.send({
    from: accounts[0],
    gas: 1500000,
    gasPrice: '30000000000',
  });
  helloWorldAddress = helloWorldContract.options.address;

  contract = new web3.eth.Contract(multicall2.abi);
  contract = contract.deploy({
    data: multicall2.bytecode,
    arguments: [],
  });
  const multicall2Contract = await contract.send({
    from: accounts[0],
    gas: 1500000,
    gasPrice: '30000000000',
  });
  multicall2Address = multicall2Contract.options.address;

  web3.setProvider(
    multicallBatcher(provider, {
      multicallAddress: multicall2Address,
      batchInterval: 200,
    })
  );
});

describe('batching', () => {
  it('returns the response', async () => {
    const contract = new web3.eth.Contract(helloWorld.abi, helloWorldAddress);
    const values = await Promise.all([
      contract.methods.value1().call(),
      contract.methods.value2().call(),
      contract.methods.value3().call(),
      contract.methods.value4().call(),
    ]);
    expect(values).toEqual(['1', '2', '3', '4']);
  });
});
