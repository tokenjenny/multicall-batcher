import { defaultAbiCoder } from '@ethersproject/abi';

interface RequestArguments {
  to: string;
  from?: string;
  data: string;
}

interface RequestDetails {
  args: RequestArguments;
  resolvers: {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }[];
}

interface Request {
  method: string;
  params: [RequestArguments, string];
}

interface Options {
  batchDebounce: boolean;
  batchInterval: number;
  batchMax: number;
  multicallAddress: string;
  v1?: boolean;
}

export default function multicallBatcher(
  provider: any,
  options: Options | undefined
) {
  const {
    batchDebounce = false,
    batchInterval = 10,
    batchMax = 0,
    v1 = false,
    multicallAddress,
  } = options || {};

  if (!multicallAddress) {
    throw new Error('multicall address required');
  }

  const _request = provider.request;
  const timeouts = new Map<string, NodeJS.Timeout>();
  const queuedRequests = new Map<
    string,
    {
      requests: Map<string, RequestDetails> | undefined;
      blockNumber: string;
      from?: string;
    }
  >();

  function requestQueue(queueKey: string): void {
    const queue = queuedRequests.get(queueKey);

    if (!queue || !queue.requests) {
      return;
    }

    queuedRequests.delete(queueKey);

    const { requests, from, blockNumber } = queue;

    const bytes = v1 ? encodeV1(requests) : encodeV2(requests);

    _request
      .apply(provider, [
        {
          method: 'eth_call',
          params: [
            {
              from,
              to: multicallAddress,
              data: bytes,
            },
            blockNumber,
          ],
        },
      ])
      .then((value: string) => {
        const data = v1 ? decodeV1(value) : decodeV2(value);

        if (data.length !== requests.size) {
          throw new Error('wrong data returned from multicall');
        }

        Array.from(requests.values()).forEach(({ resolvers }, i) => {
          resolvers.forEach(({ resolve, reject }) => {
            const [success, bytes] = data[i];
            if (!success) {
              reject(new Error(`multicall failed with ${bytes}`));
              return;
            }

            resolve(data[i][1]);
          });
        });
      })
      .catch((e: any) => {
        for (const { resolvers } of requests.values()) {
          resolvers.forEach(({ reject }) => {
            reject(e);
          });
        }
      });
  }

  function schedule(queueKey: string): void {
    timeouts.set(
      queueKey,
      setTimeout(() => {
        const blockMap = queuedRequests.get(queueKey);
        if (blockMap?.requests?.size) {
          requestQueue(queueKey);
        }
      }, batchInterval)
    );
  }

  provider.request = function (req: Request) {
    const method = req && req.method;

    if (!method || method !== 'eth_call') {
      return _request.apply(this, [req]);
    }

    const [args, blockNumber] = req.params;

    const queueKey = `${blockNumber}-${args.from || ''}`;

    return new Promise((resolve, reject) => {
      if (!queuedRequests.has(queueKey)) {
        queuedRequests.set(queueKey, {
          requests: new Map(),
          blockNumber,
          from: args.from,
        });
      }

      const blockMap = queuedRequests.get(queueKey)!.requests!;
      const key = `${args.to}-${args.data}`;

      if (!blockMap.has(key)) {
        blockMap.set(key, { args, resolvers: [] });
      }

      blockMap.get(key)!.resolvers.push({
        resolve,
        reject,
      });

      if (blockMap.size === 1) {
        schedule(queueKey);
      } else if (batchDebounce) {
        clearTimeout(timeouts.get(queueKey)!);
        schedule(queueKey);
      }

      if (blockMap.size === batchMax) {
        requestQueue(key);
      }
    });
  };
  return provider;
}

function encodeV1(requests: Map<string, RequestDetails>) {
  // aggregate((address,bytes)[])
  const aggregate = '0x252dba42';

  const calls: [string, string][] = [];
  for (const { args } of requests.values()) {
    calls.push([args.to, args.data]);
  }
  return (
    aggregate +
    defaultAbiCoder.encode(['tuple(address,bytes)[]'], [calls]).slice(2)
  );
}

function decodeV1(value: string): [boolean, string][] {
  const [, data] = defaultAbiCoder.decode(['uint256', 'bytes[]'], value) as [
    block: number,
    data: string[]
  ];

  return data.map((bytes) => [true, bytes]);
}

function encodeV2(requests: Map<string, RequestDetails>) {
  // tryAggregate(bool requireSuccess, Call[] memory calls)
  const tryAggregate = '0xbce38bd7';

  const calls: [string, string][] = [];
  for (const { args } of requests.values()) {
    calls.push([args.to, args.data]);
  }
  return (
    tryAggregate +
    defaultAbiCoder
      .encode(['bool', 'tuple(address,bytes)[]'], [false, calls])
      .slice(2)
  );
}

function decodeV2(value: string): [boolean, string][] {
  const [data] = defaultAbiCoder.decode(['tuple(bool,bytes)[]'], value) as [
    data: [boolean, string][]
  ];

  return data;
}
